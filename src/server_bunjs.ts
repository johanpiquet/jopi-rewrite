import type {ServerInstance, StartServerOptions} from "./server";

export default function startServer(options: StartServerOptions): ServerInstance {
    console.log("Starting server with Bun.serve...");
    return Bun.serve(options);
}
