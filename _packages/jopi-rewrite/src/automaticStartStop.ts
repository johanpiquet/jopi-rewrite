import {newInterval, ONE_MINUTE} from "./utils";
import { $ } from "bun";
import {onApplicationExit} from "./osSignals";
import {
    TERMINAL_BLUE_BACKGROUND,
    TERMINAL_GREEN_BACKGROUND,
    TERMINAL_RED,
    TERMINAL_RED_BACKGROUND, TERMINAL_YELLOW_BACKGROUND,
    terminalColor
} from "./colorTools";

export enum AutomaticStartStopState { Stopped, Starting, Started, Stopping }

export interface AutomaticStartStopManagerParams {
    name: string;
    requireTool?: string;

    onStart: (data: any)=>Promise<void>;
    onStop: (data: any)=>Promise<void>;

    autoShutdownAfter_ms?: number;

    /**
     * If true, the server isn't stopped when the application exit.
     * Default is false.
     */
    keepAlive?: boolean;
}

export class AutomaticStartStop {
    private _state = AutomaticStartStopState.Stopped;
    private lastStartDate: number = 0;
    private isTimerStarted = false;
    private readonly name: string;

    private isInitialized = false;
    private readonly requireTool?: string;

    private readonly startChangeListeners: (() => void)[] = [];
    private readonly autoShutdownAfterMs: number;
    private readonly onStart: (data: any)=>Promise<void>;
    private readonly onStop: (data: any)=>Promise<void>;

    public readonly data: any = {};

    /**
     * The start function which is bound to this object.
     */
    public readonly boundStart: ()=>Promise<void>;

    /**
     * The stop function which is bound to this object.
     */
    public readonly boundStop: ()=>Promise<void>;

    constructor(params: AutomaticStartStopManagerParams) {
        if (params.autoShutdownAfter_ms) this.autoShutdownAfterMs = params.autoShutdownAfter_ms;
        else this.autoShutdownAfterMs = ONE_MINUTE * 2;

        this.name = params.name;
        this.requireTool = params.requireTool;

        this.onStop = params.onStop;
        this.onStart = params.onStart;

        this.boundStart = this.start.bind(this);
        this.boundStop = this.stop.bind(this);

        if (!params.keepAlive) {
            onApplicationExit(this.boundStop);
        }
    }

    get state() {
        return this._state;
    }

    private waitStateChange(): Promise<void> {
        return new Promise<void>(resolve => {
            this.startChangeListeners.push(resolve);
        });
    }

    private setState(state: AutomaticStartStopState) {
        if (this._state === state) return;
        this._state = state;

        if (this.startChangeListeners) {
            this.startChangeListeners.forEach(l => l());
            this.startChangeListeners.splice(0);
        }
    }

    async start() {
        if (!this.isInitialized) {
            this.isInitialized = true;
            await this.initialize();
        }

        this.lastStartDate = Date.now();
        if (!this.isTimerStarted) this.startTimer();

        if (this.state===AutomaticStartStopState.Started) {
            return;
        }

        if (this.state===AutomaticStartStopState.Starting) {
            await this.waitStateChange();
            return;
        }

        if (this.state===AutomaticStartStopState.Stopping) {
            await this.waitStateChange();
        }

        // If we are here, then it's in the state "stopped".
        // But since it's async, state can have changed since.
        //
        if (this.state===AutomaticStartStopState.Stopped) {
            console.log(terminalColor(`Is starting server [${this.name}].`, TERMINAL_YELLOW_BACKGROUND));
            this.setState(AutomaticStartStopState.Starting);

            await this.onStart(this.data);

            this.setState(AutomaticStartStopState.Started);
            console.log(terminalColor(`Server [${this.name}] is started.`, TERMINAL_YELLOW_BACKGROUND));

        }
    }

    async stop() {
        if (this.state===AutomaticStartStopState.Stopped) {
            return;
        }

        if (this.state===AutomaticStartStopState.Stopping) {
            await this.waitStateChange();
            return;
        }

        if (this.state===AutomaticStartStopState.Starting) {
            await this.waitStateChange();
        }

        // If we are here, then it's in the state "started".
        // But since it's async, state can have changed since.
        //
        if (this.state===AutomaticStartStopState.Started) {
            console.log(terminalColor(`Is shutting down server [${this.name}].`, TERMINAL_RED_BACKGROUND));
            this.setState(AutomaticStartStopState.Stopping);

            await this.onStop(this.data);

            this.setState(AutomaticStartStopState.Stopped);
            console.log(terminalColor(`Server [${this.name}] is shutdown.`, TERMINAL_RED_BACKGROUND));
        }
    }

    private startTimer() {
        if (this.isTimerStarted) return;
        this.isTimerStarted = true;

        newInterval(ONE_MINUTE, async () => {
            switch (this.state) {
                case AutomaticStartStopState.Starting:
                    return true;
                case AutomaticStartStopState.Stopping:
                case AutomaticStartStopState.Stopped:
                    this.isTimerStarted = false;
                    return false;
            }

            let timeDiff = Date.now() - this.lastStartDate;

            if (timeDiff>this.autoShutdownAfterMs) {
                console.log(`Will auto shutdown server [${this.name}].`);
                await this.stop();

                this.isTimerStarted = false;
                return false;
            }

            return true;
        });
    }

    protected initialize(): Promise<void> {
        if (this.requireTool) {
            const toolPath = Bun.which(this.requireTool);
            if (toolPath === null) throw new ToolNotFoundError(this.requireTool);

            console.log(`${this.requireTool} fount at ${toolPath}.`);
        }

        return Promise.resolve();
    }
}

export class ToolNotFoundError extends Error {
    constructor(toolName: string) {
        super(`System tool ${toolName} not found.`)
    }
}