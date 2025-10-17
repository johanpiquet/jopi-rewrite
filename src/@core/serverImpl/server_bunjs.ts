import type {
    ServerInstance,
    StartServerOptions,
    ServerImpl,
    WebSocketConnectionInfos,
    SseEvent
} from "../jopiServer.ts";

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

export function onSseEvent(sseEvent: SseEvent, req: any): Promise<Response> {
    throw new Error("Method not implemented.");
}