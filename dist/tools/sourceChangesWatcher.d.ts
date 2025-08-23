import "jopi-node-space";
/**
 * Watches source directories for changes and restarts a server process automatically.
 * - Add directories to watch (recursively).
 * - Configurable delay (debounce) before restarting.
 * - Includes a helper to auto-detect the source directory when using TypeScript.
 */
export declare class SourceChangesWatcher {
    private readonly watchDirs;
    private readonly _fileWatchingDelay;
    private restarting;
    private _isStarted;
    private readonly _restartArgs;
    private _child?;
    private _enableLogs;
    private _restartDelay;
    constructor();
    enableLogs(enable: boolean): void;
    setRestartDelay(delayMs: number): void;
    /** Adds a directory to watch (subdirectories included). */
    addWatchDir(dir: string): this;
    /** Starts the child process and file watchers. */
    start(): Promise<void>;
    /** Attempt to auto-detect the main source directory.
     * Heuristics:
     * - If ./src exists, return it.
     * - If tsconfig.json exists with "rootDir", use that (relative to cwd of tsconfig).
     * - Else, if package.json has "source" or "directories.src", use it.
     * - Else, if there is a ./dist or ./build and a nearby ./src, prefer ./src.
     */
    detectSourceDir(cwd?: string): Promise<string | null>;
    private timerId;
    private askToRestart;
    private watchDirectoryRecursive;
    private spawnChild;
}
export default SourceChangesWatcher;
