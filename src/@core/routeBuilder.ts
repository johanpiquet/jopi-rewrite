import {addRoute, createRouter, findRoute, type RouterContext} from "rou3";
import type {ServerInstance, SseEvent, StartServerOptions, WebSocketConnectionInfos} from "./jopiServer.ts";
import {isBunJS} from "jopi-toolkit/jk_what";
import bunJsServer, {BunJsRouteBuilder, onSseEvent as bunOnSseEvent} from "./serverImpl/server_bunjs.ts";
import nodeJsServer, {onSseEvent as nodeSseEvent} from "./serverImpl/server_nodejs.ts";
import {type HttpMethod, JopiWebSocket, type JopiWsRouteHandler, WebSiteImpl, type WebSiteRouteInfos} from "./jopiWebSite.tsx";

export interface RouteBuilder {
    addRoute(verb: HttpMethod, path: string, routeInfos: WebSiteRouteInfos): void;

    addWsRoute(path: string, handler: (ws: JopiWebSocket, infos: WebSocketConnectionInfos) => void): void;

    addSseEVent(path: string, handler: SseEvent): void;

    startServer(params: { port: number; tls: any }): ServerInstance;

    updateTlsCertificate(certificate: any): void;
}

class DefaultRouteBuilder implements RouteBuilder {
    private readonly router: RouterContext<WebSiteRouteInfos> = createRouter<WebSiteRouteInfos>();
    private readonly wsRouter: RouterContext<JopiWsRouteHandler> = createRouter<JopiWsRouteHandler>();
    private serverImpl?: ServerInstance;
    private startServerOptions?: StartServerOptions;

    constructor(private readonly webSite: WebSiteImpl) {
    }

    addRoute(verb: HttpMethod, path: string, routeInfos: WebSiteRouteInfos) {
        addRoute(this.router, verb, path, routeInfos);
    }

    addWsRoute(path: string, handler: (ws: JopiWebSocket, infos: WebSocketConnectionInfos) => void) {
        addRoute(this.wsRouter, "ws", path, handler);
    }

    addSseEVent(path: string, handler: SseEvent): void {
        handler = {...handler};

        const onSseEvent = isBunJS ? bunOnSseEvent : nodeSseEvent;

        this.addRoute("GET", path, {
            handler: async req => {
                return onSseEvent(handler, req.coreRequest);
            }
        });
    }

    startServer(params: { port: number; tls: any }): ServerInstance {
        const fetch = async (req: Request) => {
            const urlInfos = new URL(req.url);

            const matched = findRoute(this.router, req.method, urlInfos.pathname);
            if (!matched) return new Response("", {status: 404});

            return await this.webSite.processRequest(matched.data.handler, matched.params, matched.data, urlInfos, req, server);
        };

        const options = {
            port: String(params.port),

            tls: params.tls,

            fetch,

            onWebSocketConnection: (ws: WebSocket, infos: WebSocketConnectionInfos) => {
                //const urlInfos = new URL(infos.url);

                //const jws = new JopiWebSocket(this.webSite, server, ws);
                //TODO
                //webSite.declareNewWebSocketConnection(jws, infos, urlInfos);
            }
        };

        this.startServerOptions = options;

        let server: ServerInstance;

        if (isBunJS) {
            return this.serverImpl = server = bunJsServer.startServer(options);
        } else {
            return this.serverImpl = server = nodeJsServer.startServer(options);
        }
    }

    updateTlsCertificate(certificate: any) {
        if (isBunJS) {
            bunJsServer.updateSslCertificate(this.serverImpl!, this.startServerOptions!, certificate);
        }
    }
}

export function createRouteBuilder(webSite: WebSiteImpl): RouteBuilder {
    if (isBunJS) {
        return new BunJsRouteBuilder(webSite);
    } else {
        return new DefaultRouteBuilder(webSite);
    }
}
