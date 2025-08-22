import fsp from "node:fs/promises";
import path from "node:path";
import { spawn, ChildProcess } from "node:child_process";
import chokidar from "chokidar";
import "jopi-node-space";
/**
 * Watches source directories for changes and restarts a server process automatically.
 * - Add directories to watch (recursively).
 * - Configurable delay (debounce) before restarting.
 * - Includes a helper to auto-detect the source directory when using TypeScript.
 */
export class SourceChangesWatcher {
    watchDirs = new Set();
    delayMs;
    restarting = false;
    _isStarted = false;
    restartArgs;
    child;
    constructor(options) {
        this.delayMs = options?.delayMs ?? 300;
        this.restartArgs = gArgs.slice(1);
    }
    /** Adds a directory to watch (subdirectories included). */
    addWatchDir(dir) {
        this.watchDirs.add(path.resolve(dir));
        return this;
    }
    /** Starts the child process and file watchers. */
    async start() {
        if (this._isStarted)
            return;
        this._isStarted = true;
        let sourceDir = await this.detectSourceDir();
        if (sourceDir)
            this.addWatchDir(sourceDir);
        for (const dir of this.watchDirs) {
            await this.watchDirectoryRecursive(dir);
        }
        // Create the first child.
        await this.spawnChild();
    }
    /** Attempt to auto-detect the main source directory.
     * Heuristics:
     * - If ./src exists, return it.
     * - If tsconfig.json exists with "rootDir", use that (relative to cwd of tsconfig).
     * - Else, if package.json has "source" or "directories.src", use it.
     * - Else, if there is a ./dist or ./build and a nearby ./src, prefer ./src.
     */
    async detectSourceDir(cwd = process.cwd()) {
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
    async askToRestart(filePath) {
        // Avoid it if inside a hidden directory (start by .).
        let pathParts = filePath.split(path.sep);
        let hiddenPart = pathParts.find(e => e[0] === '.');
        if (hiddenPart)
            return;
        // Avoid it if inside a node module. Reason: some tools used it as a temp.
        let nodeModule = pathParts.find(e => e === 'node_modules');
        if (nodeModule)
            return;
        console.log("File change watcher - change detected for:", filePath);
        if (this.restarting)
            return;
        this.restarting = true;
        try {
            await this.spawnChild();
        }
        finally {
            this.restarting = false;
        }
    }
    async watchDirectoryRecursive(dir) {
        const watcher = chokidar.watch(dir, {
            persistent: true,
            ignoreInitial: true,
            // Ignore common heavy/irrelevant directories
            ignored: (watchedPath) => {
                const b = path.basename(watchedPath);
                return b === 'node_modules' || b === '.git' || b === '.idea' || b === '.vscode';
            },
            awaitWriteFinish: {
                stabilityThreshold: this.delayMs,
                pollInterval: Math.min(100, this.delayMs)
            }
        });
        watcher.on('all', async (_event, paths) => { await this.askToRestart(paths); });
        watcher.on('error', () => { });
    }
    async spawnChild() {
        if (this.child) {
            this.child.kill();
            await NodeSpace.timer.tick(100);
        }
        const nodeJsPath = gArgs[0];
        this.child = spawn(nodeJsPath, this.restartArgs, {
            stdio: "inherit",
            shell: false,
            //detached: true,
            cwd: gCwd,
            env: {
                ...process.env,
                jopi_is_restart_spawn: '1'
            }
        });
        //this.child.on('spawn', () => { process.exit(0) });
        //this.child.on('error', (err) => { console.error("Can't restart", err) });
    }
}
export default SourceChangesWatcher;
const gCwd = process.cwd();
const gArgs = [...process.argv];
//# sourceMappingURL=sourceChangesWatcher.js.map