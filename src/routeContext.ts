// noinspection JSUnusedGlobalSymbols

import type {WebSite, WebSiteRoute} from "./jopiWebSite.tsx";
import type {SearchParamFilterFunction} from "./searchParamFilter.ts";
import {JopiRequest} from "./jopiRequest.js";

export function getRouteServerContext(): RouteContext {
    return gCurrentRouteContext!;
}

export class RouteContext {
    protected _hasGetHandler = false;

    constructor(protected readonly webSite: WebSite,
                protected readonly serverFilePath: string,
                protected readonly route: string,
                protected readonly next: ((req: JopiRequest) => Promise<Response>)) {
    }

    onGET(handler: (req: JopiRequest, next: (req: JopiRequest) => Promise<Response>) => Promise<Response>) {
        this._hasGetHandler = true;
        let webSiteRoute = this.webSite.onGET(this.route, req => handler(req, this.next));
        return new RouteContext_NextStep(webSiteRoute);
    }

    onPOST(handler: (req: JopiRequest) => Promise<Response>) {
        let webSiteRoute = this.webSite.onPOST(this.route, handler);
        return new RouteContext_NextStep(webSiteRoute);
    }

    onPUT(handler: (req: JopiRequest) => Promise<Response>) {
        let webSiteRoute = this.webSite.onPUT(this.route, handler);
        return new RouteContext_NextStep(webSiteRoute);
    }

    onDELETE(handler: (req: JopiRequest) => Promise<Response>) {
        let webSiteRoute = this.webSite.onDELETE(this.route, handler);
        return new RouteContext_NextStep(webSiteRoute);
    }

    onPATCH(handler: (req: JopiRequest) => Promise<Response>) {
        let webSiteRoute = this.webSite.onPATCH(this.route, handler);
        return new RouteContext_NextStep(webSiteRoute);
    }

    onHEAD(handler: (req: JopiRequest) => Promise<Response>) {
        let webSiteRoute = this.webSite.onHEAD(this.route, handler);
        return new RouteContext_NextStep(webSiteRoute);
    }

    onOPTIONS(handler: (req: JopiRequest) => Promise<Response>) {
        let webSiteRoute = this.webSite.onOPTIONS(this.route, handler);
        return new RouteContext_NextStep(webSiteRoute);
    }
}

class RouteContext_NextStep {
    private requiredRoles?: string[];

    constructor(private readonly route: WebSiteRoute) {
    }

    add_requiredRole(role: string): RouteContext_NextStep {
        if (!this.requiredRoles) {
            this.requiredRoles = [];

            const oldHandler = this.route.handler;
            const requiredRoles = this.requiredRoles;

            this.route.handler = req => {
                req.assertUserHasRoles(requiredRoles);
                return oldHandler(req);
            }
        }

        this.requiredRoles.push(role);
        return this;
    }

    add_requiredRoles(roles: string[]): RouteContext_NextStep {
        if (!this.requiredRoles) this.requiredRoles = [...roles];
        else this.requiredRoles = [...this.requiredRoles, ...roles];
        return this;
    }

    add_searchParamFiler(filter: SearchParamFilterFunction): RouteContext_NextStep {
        this.route.searchParamFilter = filter;
        return this;
    }
}

export class RouteContext_ExposePrivate extends RouteContext {
    hasGetHandler() {
        return this._hasGetHandler;
    }

    async initialize() {
        gCurrentRouteContext = this;
        await import(this.serverFilePath);
    }
}

let gCurrentRouteContext: undefined|RouteContext;