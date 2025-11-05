import type {JopiMiddleware, JopiPostMiddleware, WebSiteImpl} from "./jopiWebSite.tsx";
import type {JopiRequest} from "./jopiRequest.tsx";
import {PriorityLevel} from "../@linker";

export class RouteConfig {
    constructor(private readonly webSite: WebSiteImpl,
                private readonly route: string) {

        this.onGET = new RouteConfig_OnGET(this.webSite, this.route);
    }

    public readonly onGET: RouteConfig_OnGET;

    addMiddleware(middleware: JopiMiddleware, priority: PriorityLevel) {
        this.webSite.addMiddleware(middleware)
    }

    addPostMiddleware(middleware: JopiPostMiddleware) {
        this.webSite.addPostMiddleware(middleware);
    }
}

class RouteConfig_OnGET {
    constructor(private readonly webSite: WebSiteImpl,
                private readonly route: string) {
    }

    addRequiredRole(...roles: string[]) {
        let routeInfos = this.webSite.getRouteInfos("GET", this.route);
        if (!routeInfos) return;

        if (!routeInfos.requiredRoles) routeInfos.requiredRoles = [];
        routeInfos?.requiredRoles.push(...roles);
    }

    disableAutomaticCache() {
        let routeInfos = this.webSite.getRouteInfos("GET", this.route);
        if (!routeInfos) return;

        routeInfos.disableAutoCache = true;
    }

    afterGetFromCache(handler: (req: JopiRequest, res: Response) => Promise<Response | undefined | void>) {
        let routeInfos = this.webSite.getRouteInfos("GET", this.route);
        if (!routeInfos) return;

        routeInfos.afterGetFromCache = handler;
    }

    beforeAddToCache(handler: (req: JopiRequest, res: Response) => Promise<Response | undefined | void>) {
        let routeInfos = this.webSite.getRouteInfos("GET", this.route);
        if (!routeInfos) return;

        routeInfos.beforeAddToCache = handler;
    }

    beforeCheckingCache(handler: (req: JopiRequest) => Promise<Response | undefined | void>) {
        let routeInfos = this.webSite.getRouteInfos("GET", this.route);
        if (!routeInfos) return;

        routeInfos.beforeCheckingCache = handler;
    }
}