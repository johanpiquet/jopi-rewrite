// server.js
import http from "node:http";
import type {ServerInstance, ServerSocketAddress, StartServerOptions} from "./server.ts";

const nFS = NodeSpace.fs;

class NodeServer implements ServerInstance {
    private server: http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>;

    constructor(private options: StartServerOptions) {
        const reqFetch = options.fetch;

        this.server = http.createServer(async (req, res) => {
            const headers = new Headers(req.headers as any);

            let method = req.method!;
            const body = (method=="GET"||method==="HEAD") ? undefined : nFS.nodeStreamToWebStream(req);

            // req doesn't allow knowing if we are http or https.
            const webReq = new Request("https://" + req.headers.host! + req.url!, {body, headers, method});

            // @ts-ignore
            webReq.nodeJsReq = req;

            let webRes = reqFetch(webReq);
            if (webRes instanceof Promise) webRes = await webRes;

            let resHeaders = webRes.headers;
            let asJson: any = {};
            resHeaders.forEach((value, key) => asJson[key] = value);

            res.writeHead(webRes.status, asJson);

            if (webRes.body) {
                const asNodeStream = nFS.webStreamToNodeStream(webRes.body);
                asNodeStream.pipe(res);
            }
        });
    }

    requestIP(req: Request): ServerSocketAddress | null {
        // @ts-ignore
        let nodeReq: http.IncomingMessage = req.nodeJsReq;

        return {
            address: nodeReq.socket.remoteAddress!,
            port: nodeReq.socket.remotePort!,
            family: nodeReq.socket.remoteFamily as "IPv4" | "IPv6"
        };
    }

    async stop(_closeActiveConnections: boolean): Promise<void> {
        this.server.close();
    }

    timeout(req: Request, seconds: number): void {
        // Timeout is managed globally for all the requests.
    }

    start() {
        this.server.listen(this.options.port);
    }
}

export default function startServer(options: StartServerOptions): ServerInstance {
    const server = new NodeServer(options);
    server.start();
    return server;
}