import React from "react";
import {type HttpMethod, JopiRequest, WebSiteImpl, type WebSiteRouteInfos} from "jopi-rewrite";
import * as jk_crypto from "jopi-toolkit/jk_crypto";
import * as jk_events from "jopi-toolkit/jk_events";

export interface RouteAttributs {
    needRoles?: string[];
    disableCache?: boolean;
    config?: any;
}

type RouteHandler = (req: JopiRequest) => Promise<Response>;


function applyAttributes(infos: WebSiteRouteInfos, attributes: RouteAttributs, verb: string) {
    if (attributes.needRoles) {
        infos.requiredRoles = attributes.needRoles;
    }
}

export async function routeBindPage(webSite: WebSiteImpl, route: string, attributes: RouteAttributs, reactComponent: React.FC<any>, filePath: string) {
    const pageKey = "page_" + jk_crypto.fastHash(route);
    const infos = webSite.onPage(route, pageKey, reactComponent);

    applyAttributes(infos, attributes, "page");

    await jk_events.sendAsyncEvent("jopi.route.newPage", {route, filePath});
}

export async function routeBindVerb(webSite: WebSiteImpl, route: string, verb: HttpMethod, attributes: RouteAttributs, handler: RouteHandler) {
    const infos = webSite.onVerb(verb, route, handler);
    applyAttributes(infos, attributes, verb);
}