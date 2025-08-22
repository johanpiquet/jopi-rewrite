import http from "node:http";
import https from "node:https";
import type {ServerImpl, ServerInstance, ServerSocketAddress, StartServerOptions} from "./server.ts";
import {WebSocketServer} from "ws";

const nFS = NodeSpace.fs;

class NodeServer implements ServerInstance {
    private readonly server: http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>;

    constructor(private options: StartServerOptions) {
        async function handler(req: http.IncomingMessage, res: http.ServerResponse) {
            const headers = new Headers(req.headers as any);

            const method = req.method!;
            const body = (method == "GET" || method === "HEAD") ? undefined : nFS.nodeStreamToWebStream(req);

            // req doesn't allow knowing if we are http or https.
            const webReq = new Request("https://" + req.headers.host! + req.url!, {
                body, headers, method,
                // @ts-ignore
                duplex: "half"
            });

            // @ts-ignore
            webReq.nodeJsReq = req;

            let webRes = reqFetch(webReq);
            if (webRes instanceof Promise) webRes = await webRes;

            let resHeaders = webRes.headers;
            let asJson: any = {};
            resHeaders.forEach((value, key) => asJson[key] = value);

            res.writeHead(webRes.status, asJson);

            if (webRes.body) {
                const asNodeStream = nFS.webStreamToNodeStream(webRes.body);
                asNodeStream.pipe(res);
            }
        }

        const reqFetch = options.fetch;

        if (options.tls) {
            let key = "", cert = "";

            if (options.tls instanceof Array) {
                for (const tls of options.tls) {
                    key += tls.key;
                    cert += tls.cert;
                }
            } else {
                key = options.tls.key;
                cert = options.tls.cert;
            }

            this.server = https.createServer({key, cert}, handler);
        }
        else {
            this.server = http.createServer(handler);
        }

        const onWebSocketConnection = options.onWebSocketConnection;

        if (onWebSocketConnection) {
            const wss = new WebSocketServer({ server: this.server });

            wss.on('connection', (ws, request) => {
                onWebSocketConnection(ws as unknown as WebSocket, request.headers["host"]!);
            });
        }
    }

    requestIP(req: Request): ServerSocketAddress | null {
        // @ts-ignore
        let nodeReq: http.IncomingMessage = req.nodeJsReq;

        return {
            address: nodeReq.socket.remoteAddress!,
            port: nodeReq.socket.remotePort!,
            family: nodeReq.socket.remoteFamily as "IPv4" | "IPv6"
        };
    }

    async stop(_closeActiveConnections: boolean): Promise<void> {
        this.server.close();
    }

    timeout(_req: Request, _seconds: number): void {
        // Timeout is managed globally for all the requests.
    }

    start() {
        this.server.listen(this.options.port);
    }
}

function startServer(options: StartServerOptions): ServerInstance {
    const server = new NodeServer(options);
    server.start();
    return server;
}

function updateSslCertificate(server: ServerInstance, options: StartServerOptions, newSslCertificate: any|any[]|undefined) {
    // Not supported ...
}

const serverImpl : ServerImpl = {startServer, updateSslCertificate};
export default serverImpl;
