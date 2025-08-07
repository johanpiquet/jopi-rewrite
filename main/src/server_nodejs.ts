// server.js
import http from "node:http";
import type {ServerInstance, ServerSocketAddress, StartServerOptions} from "./server.ts";

class NodeServer implements ServerInstance {
    private server: http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>;

    constructor(private options: StartServerOptions) {
        this.server = http.createServer((req, res) => {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'text/plain');
            res.end('Bonjour le monde !\n');
        });
    }

    requestIP(req: Request): ServerSocketAddress | null {
        return null;
    }

    async stop(_closeActiveConnections: boolean): Promise<void> {
        this.server.close();
    }

    timeout(req: Request, seconds: number): void {
    }

    start() {
        this.server.listen(this.options.port);
    }
}

export default function startServer(options: StartServerOptions): ServerInstance {
    const server = new NodeServer(options);
    server.start();
    return server;
}