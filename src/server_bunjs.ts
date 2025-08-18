import type {ServerInstance, StartServerOptions} from "./server";

export default function startServer(options: StartServerOptions): ServerInstance {
    return Bun.serve(options);
}
