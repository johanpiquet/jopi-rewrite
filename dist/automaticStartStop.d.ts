import "jopi-node-space";
export declare enum AutomaticStartStopState {
    Stopped = 0,
    Starting = 1,
    Started = 2,
    Stopping = 3
}
export interface AutomaticStartStopManagerParams {
    name: string;
    requireTool?: string;
    onStart: (data: any) => Promise<void>;
    onStop: (data: any) => Promise<void>;
    autoShutdownAfter_ms?: number;
    /**
     * If true, the server isn't stopped when the application exit.
     * Default is false.
     */
    keepAlive?: boolean;
}
export declare class AutomaticStartStop {
    private _state;
    private lastStartDate;
    private isTimerStarted;
    private readonly name;
    private isInitialized;
    private readonly requireTool?;
    private readonly startChangeListeners;
    private readonly autoShutdownAfterMs;
    private readonly onStart;
    private readonly onStop;
    readonly data: any;
    /**
     * The start function which is bound to this object.
     */
    readonly boundStart: () => Promise<void>;
    /**
     * The stop function which is bound to this object.
     */
    readonly boundStop: () => Promise<void>;
    constructor(params: AutomaticStartStopManagerParams);
    get state(): AutomaticStartStopState;
    private waitStateChange;
    private setState;
    start(): Promise<void>;
    stop(): Promise<void>;
    private startTimer;
    protected initialize(): Promise<void>;
}
export declare class ToolNotFoundError extends Error {
    constructor(toolName: string);
}
