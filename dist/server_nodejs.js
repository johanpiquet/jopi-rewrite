import http from "node:http";
import https from "node:https";
import { WebSocketServer } from "ws";
const nFS = NodeSpace.fs;
class NodeServer {
    options;
    server;
    constructor(options) {
        this.options = options;
        async function handler(req, res) {
            const headers = new Headers(req.headers);
            const method = req.method;
            const body = (method == "GET" || method === "HEAD") ? undefined : nFS.nodeStreamToWebStream(req);
            // req doesn't allow knowing if we are http or https.
            const webReq = new Request("https://" + req.headers.host + req.url, {
                body, headers, method,
                // @ts-ignore
                duplex: "half"
            });
            // @ts-ignore
            webReq.nodeJsReq = req;
            let webRes = reqFetch(webReq);
            if (webRes instanceof Promise)
                webRes = await webRes;
            let resHeaders = webRes.headers;
            let asJson = {};
            resHeaders.forEach((value, key) => asJson[key] = value);
            res.writeHead(webRes.status, asJson);
            if (webRes.body) {
                const asNodeStream = nFS.webStreamToNodeStream(webRes.body);
                asNodeStream.pipe(res);
            }
        }
        const reqFetch = options.fetch;
        if (options.tls) {
            let key = "", cert = "";
            if (options.tls instanceof Array) {
                for (const tls of options.tls) {
                    key += tls.key;
                    cert += tls.cert;
                }
            }
            else {
                key = options.tls.key;
                cert = options.tls.cert;
            }
            this.server = https.createServer({ key, cert }, handler);
        }
        else {
            this.server = http.createServer(handler);
        }
        const onWebSocketConnection = options.onWebSocketConnection;
        if (onWebSocketConnection) {
            const wss = new WebSocketServer({ server: this.server });
            wss.on('connection', (ws, req) => {
                onWebSocketConnection(ws, {
                    url: "https://" + req.headers.host + req.url,
                    headers: new Headers(req.headers)
                });
            });
        }
    }
    requestIP(req) {
        // @ts-ignore
        let nodeReq = req.nodeJsReq;
        return {
            address: nodeReq.socket.remoteAddress,
            port: nodeReq.socket.remotePort,
            family: nodeReq.socket.remoteFamily
        };
    }
    async stop(_closeActiveConnections) {
        this.server.close();
    }
    timeout(_req, _seconds) {
        // Timeout is managed globally for all the requests.
    }
    start() {
        this.server.listen(this.options.port);
    }
}
function startServer(options) {
    const server = new NodeServer(options);
    server.start();
    return server;
}
function updateSslCertificate() {
    // Not supported ...
}
const serverImpl = { startServer, updateSslCertificate };
export default serverImpl;
//# sourceMappingURL=server_nodejs.js.map