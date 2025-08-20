const impl = {
    startServer(options) {
        return Bun.serve(options);
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