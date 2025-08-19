import type {ServerInstance, StartServerOptions} from "./server";

export default function startServer(options: StartServerOptions): ServerInstance {
    return Bun.serve(options);
}

export function updateSslCertificate(server: ServerInstance, key: string, cert: string) {

}