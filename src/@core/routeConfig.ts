import type {JopiMiddleware, JopiPostMiddleware, WebSiteImpl} from "./jopiWebSite.tsx";
import type {JopiRequest} from "./jopiRequest.tsx";
import {PriorityLevel} from "jopi-toolkit/jk_tools";

export class RouteConfig {
    constructor(private readonly webSite: WebSiteImpl,
                private readonly route: string) {

        this.onGET = new RouteConfig_OnGET(this.webSite, this.route, "GET");
        this.onPOST = new RouteConfig_Core(this.webSite, this.route, "POST");
        this.onPUT = new RouteConfig_Core(this.webSite, this.route, "PUT");
        this.onDELETE = new RouteConfig_Core(this.webSite, this.route, "DELETE");
        this.onHEAD = new RouteConfig_Core(this.webSite, this.route, "HEAD");
        this.onPATCH = new RouteConfig_Core(this.webSite, this.route, "PATCH");
        this.onOPTIONS = new RouteConfig_Core(this.webSite, this.route, "OPTIONS");
        this.onALL = new RouteConfig_Core(this.webSite, this.route, "*");
    }

    public readonly onGET: RouteConfig_OnGET;
    public readonly onPOST: RouteConfig_Core;
    public readonly onPUT: RouteConfig_Core;
    public readonly onDELETE: RouteConfig_Core;
    public readonly onHEAD: RouteConfig_Core;
    public readonly onPATCH: RouteConfig_Core;
    public readonly onOPTIONS: RouteConfig_Core;
    public readonly onALL: RouteConfig_Core;
}

class RouteConfig_Core {
    constructor(protected readonly webSite: WebSiteImpl,
                protected readonly route: string,
                protected readonly method: string) {
    }

    addMiddleware(middleware: JopiMiddleware, priority: PriorityLevel) {
        let routeInfos = this.webSite.getRouteInfos(this.method, this.route);
        if (!routeInfos) return;

        if (!routeInfos.middlewares) routeInfos.middlewares = [];
        routeInfos.middlewares.push({priority, value: middleware});
    }

    addPostMiddleware(middleware: JopiPostMiddleware, priority: PriorityLevel) {
        let routeInfos = this.webSite.getRouteInfos(this.method, this.route);
        if (!routeInfos) return;

        if (!routeInfos.postMiddlewares) routeInfos.postMiddlewares = [];
        routeInfos.postMiddlewares.push({priority, value: middleware});
    }

    addRequiredRole(...roles: string[]) {
        let routeInfos = this.webSite.getRouteInfos(this.method, this.route);
        if (!routeInfos) return;

        if (!routeInfos.requiredRoles) routeInfos.requiredRoles = [];
        routeInfos?.requiredRoles.push(...roles);
    }
}

class RouteConfig_OnGET extends RouteConfig_Core {
    enableAutomaticCache() {
        let routeInfos = this.webSite.getRouteInfos("GET", this.route);
        if (!routeInfos) return;

        routeInfos.mustEnableAutomaticCache = true;
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