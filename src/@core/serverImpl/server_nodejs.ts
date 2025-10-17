import http from "node:http";
import https from "node:https";
import type {
    ServerImpl,
    ServerInstance,
    ServerSocketAddress,
    SseEvent,
    SseEventController,
    StartServerOptions
} from "../jopiServer.ts";
import {WebSocketServer} from "ws";
import * as ns_fs from "jopi-node-space/ns_fs";
import {SBPE_MustReturnWithoutResponseException} from "../jopiWebSite.tsx";

class NodeServer implements ServerInstance {
    private readonly server: http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>;

    constructor(private options: StartServerOptions) {
        async function handler(req: http.IncomingMessage, res: http.ServerResponse) {
            const headers = new Headers(req.headers as any);

            const method = req.method!;
            const body = (method == "GET" || method === "HEAD") ? undefined : ns_fs.nodeStreamToWebStream(req);

            // req doesn't allow knowing if we are http or https.
            const webReq = new Request("https://" + req.headers.host! + req.url!, {
                body, headers, method,
                // @ts-ignore
                duplex: "half"
            });

            // @ts-ignore
            webReq.nodeJsReq = req;
            // @ts-ignore
            webReq.nodeJsRes = res;

            let webRes = reqFetch(webReq);
            if (webRes instanceof Promise) webRes = await webRes;
            if (webRes===undefined) return;

            let resHeaders = webRes.headers;
            let asJson: any = {};
            resHeaders.forEach((value, key) => asJson[key] = value);

            res.writeHead(webRes.status, asJson);

            if (webRes.body) {
                const asNodeStream = ns_fs.webStreamToNodeStream(webRes.body);
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

            wss.on('connection', (ws, req) => {
                onWebSocketConnection(ws as unknown as WebSocket, {
                    url: "https://" + req.headers.host! + req.url!,
                    headers: new Headers(req.headers as any)
                });
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

function updateSslCertificate() {
    // Not supported ...
}

const serverImpl : ServerImpl = {startServer, updateSslCertificate};

export default serverImpl;

interface NodeSseEvent extends SseEvent {
    clients: http.ServerResponse[];
}

export async function onSseEvent(sseEvent: SseEvent, rawReq: any): Promise<Response> {
    const req = rawReq.nodeJsReq as unknown as http.IncomingMessage;
    const res = rawReq.nodeJsRes as unknown as http.ServerResponse;

    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });

    res.write(`data: ${sseEvent.getWelcomeMessage()}\n\n`);

    const nodeSseEvent = sseEvent as NodeSseEvent;

    if (!nodeSseEvent.clients) {
        nodeSseEvent.clients = [];

        let controller: SseEventController = {
            send(data: string) {
                console.log("SssEvent - Sending ", data, "to", nodeSseEvent.clients.length, "clients");

                nodeSseEvent.clients.forEach(res => {
                    res.write(`data: ${data}\n\n`);
                });
            },

            close() {
                nodeSseEvent.clients.forEach(res => {
                    if (!res.closed) {
                        res.end();
                    }

                    nodeSseEvent.clients = [];
                });
            }
        }

        nodeSseEvent.handler(controller);
    }

    nodeSseEvent.clients.push(res);

    req.on('close', () => {
        nodeSseEvent.clients = nodeSseEvent.clients.filter(client => client !== res);
    });

    // Allow bubbling up.
    throw new SBPE_MustReturnWithoutResponseException();
}