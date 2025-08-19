import type {ServerInstance, StartServerOptions, ServerImpl} from "./server.ts";

const impl: ServerImpl = {
    startServer(options: StartServerOptions): ServerInstance {
        return Bun.serve(options);
    },

    updateSslCertificate(server: ServerInstance, sslCertificate: any|any[]|undefined): void {

    }
}

export default impl;