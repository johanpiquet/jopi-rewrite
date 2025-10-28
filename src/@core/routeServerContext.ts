// noinspection JSUnusedGlobalSymbols

import type {WebSite, WebSiteRouteInfos} from "./jopiWebSite.tsx";
import type {SearchParamFilterFunction} from "./searchParamFilter.ts";
import {JopiRequest} from "./jopiRequest.js";

/**
 * Is used by the server page inside the route folder to bound the route to the url.
 * Ex: /routes/product/index.server.tsx
 */
export class RouteServerContext {
    protected _hasGetHandler = false;

    constructor(protected readonly webSite: WebSite,
                protected readonly serverFilePath: string,
                protected readonly route: string) {
    }

    onGET(req: (req: JopiRequest) => Promise<Response>) {
        this._hasGetHandler = true;
        let webSiteRoute = this.webSite.onGET(this.route, req);
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

    constructor(private readonly route: WebSiteRouteInfos) {
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

export class RouteServerContext_ExposePrivate extends RouteServerContext {
    hasGetHandler() {
        return this._hasGetHandler;
    }

    async initialize() {
        const defaultExport = (await import(this.serverFilePath)).default;

        if (defaultExport && (typeof defaultExport === 'function')) {
            defaultExport(this);
        }
    }
}