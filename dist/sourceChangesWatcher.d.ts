export interface WatcherCommandOptions {
    cwd?: string;
    env?: NodeJS.ProcessEnv;
}
export interface SourceChangesWatcherOptions {
    delayMs?: number;
}
/**
 * Watches source directories for changes and restarts a server process automatically.
 * - Add directories to watch (recursively).
 * - Configurable delay (debounce) before restarting.
 * - Includes a helper to auto-detect the source directory when using TypeScript.
 */
export declare class SourceChangesWatcher {
    private readonly watchDirs;
    private delayMs;
    private cmd?;
    private child?;
    private restarting;
    private debounceTimer?;
    private readonly watchers;
    private closed;
    constructor(options?: SourceChangesWatcherOptions);
    /** Sets the debounce delay (ms) before a restart is triggered. */
    setDelay(ms: number): this;
    /** Adds a directory to watch (subdirectories included). */
    addWatchDir(dir: string): this;
    /** Defines the command to start the server process. */
    setRestartCommand(command: string, args?: string[], options?: WatcherCommandOptions): this;
    /** Starts the child process and file watchers. */
    start(): Promise<void>;
    /** Stops file watchers and the child process. */
    stop(): Promise<void>;
    /** Attempt to auto-detect the main source directory.
     * Heuristics:
     * - If ./src exists, return it.
     * - If tsconfig.json exists with "rootDir", use that (relative to cwd of tsconfig).
     * - Else, if package.json has "source" or "directories.src", use it.
     * - Else, if there is a ./dist or ./build and a nearby ./src, prefer ./src.
     */
    static detectSourceDir(cwd?: string): Promise<string | null>;
    private buildDefaultCommand;
    private spawnChild;
    private stopChild;
    private scheduleRestart;
    private restartChild;
    private watchDirectoryRecursive;
    private attachWatcher;
    private collectSubdirectories;
}
export default SourceChangesWatcher;
