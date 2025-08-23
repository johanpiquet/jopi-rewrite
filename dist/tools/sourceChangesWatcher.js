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
    _fileWatchingDelay = 500;
    restarting = false;
    _isStarted = false;
    _restartArgs;
    _child;
    _enableLogs = false;
    _restartDelay = 1500;
    constructor() {
        this._restartArgs = gArgs.slice(1);
    }
    enableLogs(enable) {
        this._enableLogs = enable;
    }
    setRestartDelay(delayMs) {
        this._restartDelay = delayMs;
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
    timerId = 0;
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
        // Allow avoiding restart until stability is found.
        if (this.timerId) {
            return;
        }
        // @ts-ignore
        this.timerId = setTimeout(async () => {
            this.timerId = 0;
            if (this.restarting)
                return;
            this.restarting = true;
            console.clear();
            if (this._enableLogs) {
                console.log("File change watcher - RESTART for:", filePath);
            }
            try {
                await this.spawnChild();
            }
            finally {
                this.restarting = false;
            }
        }, this._restartDelay);
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
                stabilityThreshold: this._fileWatchingDelay,
                pollInterval: Math.min(100, this._fileWatchingDelay)
            }
        });
        watcher.on('all', async (_event, paths) => { await this.askToRestart(paths); });
        watcher.on('error', () => { });
    }
    async spawnChild() {
        if (this._child) {
            this._child.kill();
            await NodeSpace.timer.tick(100);
        }
        const nodeJsPath = gArgs[0];
        let useShell = nodeJsPath.endsWith('.cmd') || nodeJsPath.endsWith('.bat') || nodeJsPath.endsWith('.sh');
        this._child = spawn(nodeJsPath, this._restartArgs, {
            stdio: "inherit",
            shell: useShell,
            cwd: gCwd,
            env: {
                ...process.env,
                jopi_is_restart_spawn: '1'
            }
        });
    }
}
export default SourceChangesWatcher;
const gCwd = process.cwd();
const gArgs = [...process.argv];
//# sourceMappingURL=sourceChangesWatcher.js.map