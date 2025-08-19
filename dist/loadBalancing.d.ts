import type { ServerFetch } from "./serverFetch.ts";
import { JopiRequest, type SendingBody } from "./core.tsx";
export declare class LoadBalancer {
    private readonly servers;
    private totalWeight;
    private head?;
    private tail?;
    private lastUsedServer?;
    private isTimerStarted;
    addServer<T>(server: ServerFetch<T>, weight?: number): void;
    replaceServer<T>(oldServer: ServerFetch<T>, newServer: ServerFetch<T>, weight?: number): void;
    private selectServer;
    fetch(method: string, url: URL, body?: SendingBody, headers?: any): Promise<Response>;
    directProxy(serverRequest: JopiRequest): Promise<Response>;
    private declareServerDown;
    onTimer(): boolean;
}
