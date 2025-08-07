import { createRequire } from 'node:module';
import "jopi-node-space";
import path from "node:path";

export interface StartServerCoreOptions {
    /**
     * The timeout value for a request.
     * See: https://bun.sh/reference/bun/Server/timeout
     */
    timeout?: number;
}

let myRequire: NodeJS.Require;

function doRequire(filename: string): any {
    try {
        if (NodeSpace.what.isBunJs) {
            return require(filename);
        }

        if (filename[0]==='.') {
            filename = path.resolve(path.join(import.meta.dirname, filename));
        }

        if (!myRequire) {
            myRequire = createRequire(import.meta.dirname);
        }

        return myRequire(filename);
    }
    catch (e: any) {
        if (e.code==="MODULE_NOT_FOUND") {
            console.error(`Can't find module ${filename}.`);
        }

        throw e;
    }
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
    tls?: TlsCertificate|TlsCertificate[],

    fetch: (req: Request) => Response|Promise<Response>;
}

export interface TlsCertificate {
    key: string;
    cert: string;
    serverName: string;
}

type StartServerFunction = (options: StartServerOptions) => ServerInstance;

let serverImpl: StartServerFunction;

if (NodeSpace.what.isBunJs) {
    if (import.meta.filename.endsWith(".ts")) serverImpl = doRequire("./server_bunjs.ts").default;
    else serverImpl = doRequire("./server_bunjs.js").default;
} else {
    serverImpl = doRequire("./server_nodejs.js").default;
}

export const startServer = serverImpl;

export interface ServerInstance {
    requestIP(req: Request): ServerSocketAddress|null;
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