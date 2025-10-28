import type {ServerInstance, SseEvent, WebSocketConnectionInfos} from "./jopiServer.ts";
import {isBunJS} from "jopi-toolkit/jk_what";
import {BunJsServerInstanceBuilder} from "./serverImpl/server_bunjs.ts";
import {NodeJsServerInstanceBuilder} from "./serverImpl/server_nodejs.ts";
import {type HttpMethod, JopiWebSocket, WebSiteImpl, type WebSiteRouteInfos} from "./jopiWebSite.tsx";

export interface ServerInstanceBuilder {
    addRoute(verb: HttpMethod, path: string, routeInfos: WebSiteRouteInfos): void;

    addWsRoute(path: string, handler: (ws: JopiWebSocket, infos: WebSocketConnectionInfos) => void): void;

    addSseEVent(path: string, handler: SseEvent): void;

    startServer(params: { port: number; tls: any }): ServerInstance;

    updateTlsCertificate(certificate: any): void;
}

export function createRouteBuilder(webSite: WebSiteImpl): ServerInstanceBuilder {
    if (isBunJS) {
        return new BunJsServerInstanceBuilder(webSite);
    } else {
        return new NodeJsServerInstanceBuilder(webSite);
    }
}
