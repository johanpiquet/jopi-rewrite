import type {
    ServerInstance,
    StartServerOptions,
    ServerImpl,
    WebSocketConnectionInfos,
    SseEvent, SseEventController
} from "../jopiServer.ts";
import http from "node:http";

const impl: ServerImpl = {
    startServer(options: StartServerOptions): ServerInstance {
        const optionsFetch = options.fetch;

        if (options.onWebSocketConnection) {
            const onWebSocketConnection = options.onWebSocketConnection;

            const server = Bun.serve({
                ...options,

                websocket: {
                    async message(ws, message) {
                        let listener = (ws.data as unknown as WebSocketData).onMessage;
                        if (listener) listener(message);
                    },

                    async open(ws) {
                        const data = ws.data as unknown as WebSocketData;
                        onWebSocketConnection(ws as unknown as WebSocket, data as WebSocketConnectionInfos);

                        // Clean-up.
                        data.headers = undefined;
                        data.url = undefined;
                    },

                    close(ws, code, reason) {
                        let listener = (ws.data as unknown as WebSocketData).onClosed;
                        if (listener) listener(code, reason);
                    }
                },

                fetch(req) {
                    // Try to automatically upgrade the websocket.
                    if (req.headers.get("upgrade") === "websocket") {
                        // We will automatically have a call to websocket.open once ok.
                        const success = server.upgrade(req, {
                            // @ts-ignore
                            data: {url: req.url, headers: req.headers} as unknown as WebSocketData
                        });

                        if (success) return undefined;

                        return new Response("Can't update websocket", {status: 500});
                    }

                    return optionsFetch(req);
                }
            });

            return server;
        } else {
            // @ts-ignore
            return Bun.serve(options);
        }
    },

    updateSslCertificate(server: ServerInstance, options: StartServerOptions, newSslCertificate: any|any[]|undefined): void {
        const bunServer = server as Bun.Server<unknown>
        options.tls = newSslCertificate;

        // Will reload without breaking the current connections.
        // @ts-ignore
        bunServer.reload(options);
    }
}

interface WebSocketData {
    url?: string,
    headers?: Headers,

    onMessage?: (msg: string|Buffer) => void
    onClosed?: (code: number, reason: string) => void
}

export default impl;

//region SSE Events

interface SseClient {
    controller: ReadableStreamDefaultController,
    me: any
}

interface BunSseEvent extends SseEvent {
    clients: SseClient[];
}

export async function onSseEvent(sseEvent: SseEvent): Promise<Response> {
    // Serve a reference for this client.
    // To know: stream can't be used because it's not initialized yet.
    const me = {};

    const stream = new ReadableStream({
        start(controller) {
            const nodeSseEvent = sseEvent as BunSseEvent;

            if (!nodeSseEvent.clients) {
                nodeSseEvent.clients = [];

                let controller: SseEventController = {
                    send(eventName: string, data: string) {
                        let toSend = `event: ${eventName}\ndata: ${ JSON.stringify({message: data}) }\n\n`;
                        const encoder = new TextEncoder();
                        const encodedData = encoder.encode(toSend);
                        nodeSseEvent.clients.forEach(e => { e.controller.enqueue(encodedData); });
                        console.log("sse - sending to",  nodeSseEvent.clients.length, "clients")
                    },

                    close() {
                        nodeSseEvent.clients.forEach(e => {
                            e.controller.close();
                        });

                        nodeSseEvent.clients = [];
                    }
                }

                nodeSseEvent.handler(controller);
            }

            nodeSseEvent.clients.push({controller, me});

            const initialData = sseEvent.getWelcomeMessage();

            const encoder = new TextEncoder();
            controller.enqueue(encoder.encode(`data: ${initialData}\n\n`));
        },

        cancel() {
            const nodeSseEvent = sseEvent as BunSseEvent;
            nodeSseEvent.clients = nodeSseEvent.clients.filter(e => e.me !== me);
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        }
    });
}

//endregion