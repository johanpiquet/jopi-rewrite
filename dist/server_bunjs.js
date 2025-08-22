const impl = {
    startServer(options) {
        const optionsFetch = options.fetch;
        if (options.onWebSocketConnection) {
            const onWebSocketConnection = options.onWebSocketConnection;
            const server = Bun.serve({
                ...options,
                websocket: {
                    async message(ws, message) {
                    },
                    open(ws) {
                        const host = ws.data.host;
                        onWebSocketConnection(ws, host);
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
                        });
                        if (success)
                            return;
                        return new Response("Can't update websocket", { status: 500 });
                    }
                    return optionsFetch(req);
                }
            });
            return server;
        }
        else {
            return Bun.serve(options);
        }
    },
    updateSslCertificate(server, options, newSslCertificate) {
        const bunServer = server;
        options.tls = newSslCertificate;
        // Will reload without breaking the current connections.
        bunServer.reload(options);
    }
};
export default impl;
//# sourceMappingURL=server_bunjs.js.map