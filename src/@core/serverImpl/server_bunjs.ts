import type {CoreServer, WebSocketConnectionInfos, SseEvent, SseEventController} from "../jopiServer.ts";
import type {HttpMethod, JopiWebSocket, WebSiteImpl, WebSiteRouteInfos} from "../jopiWebSite.ts";
import type {ServerInstanceBuilder} from "../serverInstanceBuilder.ts";

/*interface WebSocketData {
    url?: string,
    headers?: Headers,

    onMessage?: (msg: string|Buffer) => void
    onClosed?: (code: number, reason: string) => void
}*/

//region SSE Events

interface SseClient {
    controller: ReadableStreamDefaultController,
    me: any
}

interface BunSseEvent extends SseEvent {
    clients: SseClient[];
}

export async function onSseEvent(sseEvent: SseEvent): Promise<Response> {
    // Serve a reference for this client.
    // To know: stream can't be used because it's not initialized yet.
    const me = {};

    const stream = new ReadableStream({
        start(controller) {
            const nodeSseEvent = sseEvent as BunSseEvent;

            if (!nodeSseEvent.clients) {
                nodeSseEvent.clients = [];

                let controller: SseEventController = {
                    send(eventName: string, data: string) {
                        let toSend = `event: ${eventName}\ndata: ${ JSON.stringify({message: data}) }\n\n`;
                        const encoder = new TextEncoder();
                        const encodedData = encoder.encode(toSend);
                        nodeSseEvent.clients.forEach(e => { e.controller.enqueue(encodedData); });
                        console.log("sse - sending to",  nodeSseEvent.clients.length, "clients")
                    },

                    close() {
                        nodeSseEvent.clients.forEach(e => {
                            e.controller.close();
                        });

                        nodeSseEvent.clients = [];
                    }
                }

                nodeSseEvent.handler(controller);
            }

            nodeSseEvent.clients.push({controller, me});

            const initialData = sseEvent.getWelcomeMessage();

            const encoder = new TextEncoder();
            controller.enqueue(encoder.encode(`data: ${initialData}\n\n`));
        },

        cancel() {
            const nodeSseEvent = sseEvent as BunSseEvent;
            nodeSseEvent.clients = nodeSseEvent.clients.filter(e => e.me !== me);
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        }
    });
}

//endregion

//region ServerInstanceProvider

export class BunJsServerInstanceBuilder implements ServerInstanceBuilder {
    private bunServer?: Bun.Server<unknown>;
    private serverOptions?: any;
    private serverRoutes: any = {};

    constructor(private readonly webSite: WebSiteImpl) {
    }

    addRoute(verb: HttpMethod, path: string, route: WebSiteRouteInfos) {
        if (path==="/_bundle/**") debugger;

        if (!this.serverRoutes[path]) {
            this.serverRoutes[path] = {};
        }

        const webSite = this.webSite;

        this.serverRoutes[path][verb] = (req: Request, urlParts: any) => {
            return webSite.processRequest(route.handler, urlParts, route, undefined, req, this.bunServer!);
        }
    }

    addWsRoute(path: string, handler: (ws: JopiWebSocket, infos: WebSocketConnectionInfos) => void) {
        //TODO
    }

    addSseEVent(path: string, handler: SseEvent): void {
        handler = {...handler};

        this.addRoute("GET", path, {
            handler: async _ => {
                return onSseEvent(handler);
            }
        });
    }

    startServer(params: { port: number; tls: any }): CoreServer {
        const options = {
            port: String(params.port),
            tls: params.tls,
            routes: this.serverRoutes
        };

        this.serverOptions = options;

        return this.bunServer = Bun.serve(options);
    }

    updateTlsCertificate(certificate: any) {
        this.serverOptions.tls = certificate;

        // Will reload without breaking the current connections.
        // @ts-ignore
        this.bunServer.reload(this.serverOptions);
    }
}

//endregion