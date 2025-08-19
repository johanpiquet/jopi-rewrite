import type { ServerInstance, StartServerOptions } from "./server";
export default function startServer(options: StartServerOptions): ServerInstance;
export declare function updateSslCertificate(server: ServerInstance, key: string, cert: string): void;
