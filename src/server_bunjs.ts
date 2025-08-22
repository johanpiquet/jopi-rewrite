import type {ServerInstance, StartServerOptions, ServerImpl} from "./server.ts";

const impl: ServerImpl = {
    startServer(options: StartServerOptions): ServerInstance {
        const optionsFetch = options.fetch;

        if (options.onWebSocketConnection) {
            const onWebSocketConnection = options.onWebSocketConnection;

            const server = Bun.serve({
                ...options,

                websocket: {
                    async message(ws, message) {
                    },

                    open(ws) {
                        const host = (ws.data as any).host;
                        onWebSocketConnection(ws as unknown as WebSocket, host);
                    },

                    close(ws, code, reason) {
                    },

                    drain(ws) {
                    },
                },

                fetch(req) {
                    // Try to automatically upgrade the websocket.
                    if (req.headers.get("upgrade") === "websocket") {

                        // We will automatically have a call to websocket.open once ok.
                        const success = server.upgrade(req, {
                            host: req.headers.get("host")
                        } as any);

                        if (success) return;
                        return new Response("Can't update websocket", {status: 500});
                    }

                    return optionsFetch(req);
                }
            });

            return server;
        } else {
            return Bun.serve(options);
        }
    },

    updateSslCertificate(server: ServerInstance, options: StartServerOptions, newSslCertificate: any|any[]|undefined): void {
        const bunServer = server as Bun.Server
        options.tls = newSslCertificate;

        // Will reload without breaking the current connections.
        bunServer.reload(options);
    }
}

export default impl;