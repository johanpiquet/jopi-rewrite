import type {ServerInstance, StartServerOptions, ServerImpl} from "./server.ts";

const impl: ServerImpl = {
    startServer(options: StartServerOptions): ServerInstance {
        return Bun.serve(options);
    },

    updateSslCertificate(server: ServerInstance, options: StartServerOptions, newSslCertificate: any|any[]|undefined): void {
        const bunServer = server as Bun.Server
        options.tls = newSslCertificate;

        // Will reload without breaking the current connections.
        bunServer.reload(options);
    }
}

export default impl;