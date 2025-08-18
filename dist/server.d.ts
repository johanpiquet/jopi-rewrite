import "jopi-node-space";
export interface StartServerCoreOptions {
    /**
     * The timeout value for a request.
     * See: https://bun.sh/reference/bun/Server/timeout
     */
    timeout?: number;
}
export interface StartServerOptions extends StartServerCoreOptions {
    /**
     * The port to listen to.
     * The default is "3000".
     */
    port?: string;
    /**
     * The TLS certificate to use (for https).
     */
    tls?: TlsCertificate | TlsCertificate[];
    fetch: (req: Request) => Response | Promise<Response>;
}
export interface TlsCertificate {
    key: string;
    cert: string;
    serverName: string;
}
type StartServerFunction = (options: StartServerOptions) => ServerInstance;
export declare const startServer: StartServerFunction;
export interface ServerInstance {
    requestIP(req: Request): ServerSocketAddress | null;
    timeout(req: Request, seconds: number): void;
    stop(closeActiveConnections: boolean): Promise<void>;
}
export interface ServerSocketAddress {
    /**
     * The IP address of the client.
     */
    address: string;
    /**
     * The port of the client.
     */
    port: number;
    /**
     * The IP family ("IPv4" or "IPv6").
     */
    family: "IPv4" | "IPv6";
}
export {};
