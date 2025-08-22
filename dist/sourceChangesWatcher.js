import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
/**
 * Watches source directories for changes and restarts a server process automatically.
 * - Add directories to watch (recursively).
 * - Configurable delay (debounce) before restarting.
 * - Includes a helper to auto-detect the source directory when using TypeScript.
 */
export class SourceChangesWatcher {
    watchDirs = new Set();
    delayMs;
    cmd;
    child;
    restarting = false;
    debounceTimer;
    watchers = [];
    closed = false;
    constructor(options) {
        this.delayMs = options?.delayMs ?? 300;
    }
    /** Sets the debounce delay (ms) before a restart is triggered. */
    setDelay(ms) { this.delayMs = ms; return this; }
    /** Adds a directory to watch (subdirectories included). */
    addWatchDir(dir) {
        this.watchDirs.add(path.resolve(dir));
        return this;
    }
    /** Defines the command to start the server process. */
    setRestartCommand(command, args = [], options) {
        this.cmd = { command, args, options };
        return this;
    }
    /** Starts the child process and file watchers. */
    async start() {
        if (this.closed)
            throw new Error("This watcher was stopped/closed and cannot be restarted.");
        // If no command was explicitly set, default to restarting the current program with same options
        if (!this.cmd) {
            this.cmd = this.buildDefaultCommand();
        }
        // Spawn initial process
        this.spawnChild();
        // Setup watchers
        for (const dir of this.watchDirs) {
            await this.watchDirectoryRecursive(dir);
        }
    }
    /** Stops file watchers and the child process. */
    async stop() {
        this.closed = true;
        // Close watchers
        for (const w of this.watchers.splice(0)) {
            try {
                w.close();
            }
            catch { }
        }
        // Stop child
        await this.stopChild();
    }
    /** Attempt to auto-detect the main source directory.
     * Heuristics:
     * - If ./src exists, return it.
     * - If tsconfig.json exists with "rootDir", use that (relative to cwd of tsconfig).
     * - Else, if package.json has "source" or "directories.src", use it.
     * - Else, if there is a ./dist or ./build and a nearby ./src, prefer ./src.
     */
    static async detectSourceDir(cwd = process.cwd()) {
        const tryDir = async (p) => {
            try {
                const st = await fsp.stat(p);
                return st.isDirectory() ? p : null;
            }
            catch {
                return null;
            }
        };
        // 1) ./src
        const src = await tryDir(path.join(cwd, "src"));
        if (src)
            return src;
        // 2) tsconfig.json rootDir
        try {
            const tsconfigPath = path.join(cwd, "tsconfig.json");
            const raw = await fsp.readFile(tsconfigPath, "utf8");
            const tsconfig = JSON.parse(raw);
            const rootDir = tsconfig?.compilerOptions?.rootDir;
            if (rootDir) {
                const p = await tryDir(path.resolve(cwd, rootDir));
                if (p)
                    return p;
            }
        }
        catch { }
        // 3) package.json hints
        try {
            const pkgPath = path.join(cwd, "package.json");
            const raw = await fsp.readFile(pkgPath, "utf8");
            const pkg = JSON.parse(raw);
            const hinted = pkg.source || pkg?.directories?.src;
            if (hinted) {
                const p = await tryDir(path.resolve(cwd, hinted));
                if (p)
                    return p;
            }
        }
        catch { }
        // 4) dist/build with sibling src
        const dist = await tryDir(path.join(cwd, "dist"));
        if (dist) {
            const siblingSrc = await tryDir(path.join(cwd, "src"));
            if (siblingSrc)
                return siblingSrc;
        }
        const build = await tryDir(path.join(cwd, "build"));
        if (build) {
            const siblingSrc = await tryDir(path.join(cwd, "src"));
            if (siblingSrc)
                return siblingSrc;
        }
        return null;
    }
    //region Internals
    buildDefaultCommand() {
        const command = process.execPath || process.argv[0];
        const execArgv = process.execArgv ?? [];
        const args = [...execArgv, ...process.argv.slice(1)];
        return {
            command,
            args,
            options: {
                cwd: process.cwd(),
                env: process.env
            }
        };
    }
    spawnChild() {
        if (!this.cmd)
            return;
        const { command, args, options } = this.cmd;
        this.child = spawn(command, args, {
            stdio: "inherit",
            shell: false,
            ...options,
        });
        this.child.on("exit", (code, signal) => {
            // If we are restarting, spawn will be handled there.
            if (!this.restarting && !this.closed) {
                // Unexpected exit: auto-restart
                this.spawnChild();
            }
        });
    }
    async stopChild() {
        const ch = this.child;
        if (!ch)
            return;
        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                // Force kill if not exiting
                try {
                    ch.kill("SIGKILL");
                }
                catch { }
                resolve();
            }, 2000);
            ch.once("exit", () => {
                clearTimeout(timeout);
                resolve();
            });
            try {
                // Politely ask to terminate
                ch.kill("SIGTERM");
            }
            catch {
                clearTimeout(timeout);
                resolve();
            }
        }).finally(() => {
            this.child = undefined;
        });
    }
    scheduleRestart() {
        if (this.closed)
            return;
        if (this.debounceTimer)
            clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(async () => {
            await this.restartChild();
        }, this.delayMs);
    }
    async restartChild() {
        if (this.restarting)
            return;
        this.restarting = true;
        try {
            await this.stopChild();
            this.spawnChild();
        }
        finally {
            this.restarting = false;
        }
    }
    async watchDirectoryRecursive(dir) {
        // On some platforms, fs.watch supports recursive; on others it doesn't. We'll set up a manual recursion.
        const directories = await this.collectSubdirectories(dir);
        for (const d of directories) {
            this.attachWatcher(d);
        }
    }
    attachWatcher(dir) {
        try {
            const watcher = fs.watch(dir, { persistent: true }, async (eventType, filename) => {
                // Any change triggers restart with debounce
                this.scheduleRestart();
                // If new subdirectory is added, ensure it is watched too
                if (filename && eventType === "rename") {
                    const full = path.join(dir, filename.toString());
                    try {
                        const st = await fsp.stat(full);
                        if (st.isDirectory()) {
                            // New directory appeared: add recursive watchers for it
                            const subs = await this.collectSubdirectories(full);
                            subs.forEach(d => this.attachWatcher(d));
                        }
                    }
                    catch {
                        // file/directory removed; ignore
                    }
                }
            });
            watcher.on("error", () => { });
            this.watchers.push(watcher);
        }
        catch {
            // ignore
        }
    }
    async collectSubdirectories(root) {
        const all = [];
        const stack = [root];
        while (stack.length) {
            const current = stack.pop();
            all.push(current);
            let entries = [];
            try {
                entries = await fsp.readdir(current, { withFileTypes: true });
            }
            catch {
                continue;
            }
            for (const e of entries) {
                // Ignore hidden/system folders like node_modules or .git to avoid excessive restarts
                if (e.isDirectory()) {
                    if (e.name === "node_modules" || e.name === ".git" || e.name === ".idea" || e.name === ".vscode")
                        continue;
                    stack.push(path.join(current, e.name));
                }
            }
        }
        return all;
    }
}
export default SourceChangesWatcher;
//# sourceMappingURL=sourceChangesWatcher.js.map