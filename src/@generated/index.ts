import React from "react";
import {type HttpMethod, JopiRequest, WebSiteImpl, type WebSiteRouteInfos} from "jopi-rewrite";
import * as jk_crypto from "jopi-toolkit/jk_crypto";
import * as jk_events from "jopi-toolkit/jk_events";
import {PriorityLevel} from "jopi-toolkit/jk_tools";

export interface RouteAttributs {
    needRoles?: Record<string, string[]>;
    disableCache?: boolean;
    priority?: PriorityLevel;
    configFile?: string;
}

type RouteHandler = (req: JopiRequest) => Promise<Response>;

function applyAttributes(infos: WebSiteRouteInfos, attributes: RouteAttributs, verb: string) {
    if (attributes.needRoles) {
        infos.requiredRoles = attributes.needRoles[verb];

        let allRoles =  attributes.needRoles["all"];
        if (allRoles) infos.requiredRoles = infos.requiredRoles?.concat(allRoles);
    }
}

export async function routeBindPage(webSite: WebSiteImpl, route: string, attributes: RouteAttributs, reactComponent: React.FC<any>, filePath: string) {
    const pageKey = "page_" + jk_crypto.fastHash(route);
    let infos: WebSiteRouteInfos;

    if (route==="/") {
        infos = webSite.onPage(route, pageKey, reactComponent);
    } else {
        infos = webSite.onPage(route + "/", pageKey, reactComponent);

        // Note: with node.js, the router doesn't distinguish with and without /
        // It's why the redirection is done internally.
        //
        webSite.onGET(route, async (req) => {
            req.urlInfos.pathname += "/";
            return Response.redirect(req.urlInfos.href, 301);
        });
    }

    applyAttributes(infos, attributes, "PAGE");

    await jk_events.sendAsyncEvent("jopi.route.newPage", {route, filePath});
}

export async function routeBindVerb(webSite: WebSiteImpl, route: string, verb: HttpMethod, attributes: RouteAttributs, handler: RouteHandler) {
    const infos = webSite.onVerb(verb, route + "/", handler);
    applyAttributes(infos, attributes, verb);
}