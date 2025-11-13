var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
import { PriorityLevel } from "jopi-toolkit/jk_tools";
var RouteConfig = /** @class */ (function () {
    function RouteConfig(webSite, route) {
        this.webSite = webSite;
        this.route = route;
        this.onGET = new RouteConfig_OnGET(this.webSite, this.route, "GET");
        this.onPOST = new RouteConfig_Core(this.webSite, this.route, "POST");
        this.onPUT = new RouteConfig_Core(this.webSite, this.route, "PUT");
        this.onDELETE = new RouteConfig_Core(this.webSite, this.route, "DELETE");
        this.onHEAD = new RouteConfig_Core(this.webSite, this.route, "HEAD");
        this.onPATCH = new RouteConfig_Core(this.webSite, this.route, "PATCH");
        this.onOPTIONS = new RouteConfig_Core(this.webSite, this.route, "OPTIONS");
        this.onALL = new RouteConfig_Core(this.webSite, this.route, "*");
    }
    return RouteConfig;
}());
export { RouteConfig };
var RouteConfig_Core = /** @class */ (function () {
    function RouteConfig_Core(webSite, route, method) {
        this.webSite = webSite;
        this.route = route;
        this.method = method;
    }
    RouteConfig_Core.prototype.add_middleware = function (middleware, priority) {
        if (priority === void 0) { priority = PriorityLevel.default; }
        var routeInfos = this.webSite.getRouteInfos(this.method, this.route);
        if (!routeInfos)
            return;
        if (!routeInfos.middlewares)
            routeInfos.middlewares = [];
        routeInfos.middlewares.push({ priority: priority, value: middleware });
    };
    RouteConfig_Core.prototype.add_postMiddleware = function (middleware, priority) {
        if (priority === void 0) { priority = PriorityLevel.default; }
        var routeInfos = this.webSite.getRouteInfos(this.method, this.route);
        if (!routeInfos)
            return;
        if (!routeInfos.postMiddlewares)
            routeInfos.postMiddlewares = [];
        routeInfos.postMiddlewares.push({ priority: priority, value: middleware });
    };
    RouteConfig_Core.prototype.add_requiredRole = function () {
        var _a;
        var roles = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            roles[_i] = arguments[_i];
        }
        var routeInfos = this.webSite.getRouteInfos(this.method, this.route);
        if (!routeInfos)
            return;
        if (!routeInfos.requiredRoles)
            routeInfos.requiredRoles = [];
        routeInfos === null || routeInfos === void 0 ? void 0 : (_a = routeInfos.requiredRoles).push.apply(_a, roles);
    };
    return RouteConfig_Core;
}());
var RouteConfig_OnGET = /** @class */ (function (_super) {
    __extends(RouteConfig_OnGET, _super);
    function RouteConfig_OnGET() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    RouteConfig_OnGET.prototype.cache_disableAutomaticCache = function () {
        var routeInfos = this.webSite.getRouteInfos("GET", this.route);
        if (!routeInfos)
            return;
        routeInfos.mustEnableAutomaticCache = false;
    };
    /**
     * Define a function which is called when the response is get from the cache.
     * If a value is returned, then this value is used as the new value,
     * allowing to replace what comes from the cache.
     * @param handler
     */
    RouteConfig_OnGET.prototype.cache_afterGetFromCache = function (handler) {
        var routeInfos = this.webSite.getRouteInfos("GET", this.route);
        if (!routeInfos)
            return;
        routeInfos.afterGetFromCache = handler;
    };
    /**
     * Defines a function which can alter the response to save into the cache or avoid cache adding.
     * If returns a response: this response will be added into the cache.
     * If returns undefined: will not add the response into the cache.
     */
    RouteConfig_OnGET.prototype.cache_beforeAddToCache = function (handler) {
        var routeInfos = this.webSite.getRouteInfos("GET", this.route);
        if (!routeInfos)
            return;
        routeInfos.beforeAddToCache = handler;
    };
    /**
     * Define a function which is called before checking the cache.
     * This allows doing some checking, and if needed, it can return
     * a response and bypass the request cycle.
     */
    RouteConfig_OnGET.prototype.cache_beforeCheckingCache = function (handler) {
        var routeInfos = this.webSite.getRouteInfos("GET", this.route);
        if (!routeInfos)
            return;
        routeInfos.beforeCheckingCache = handler;
    };
    return RouteConfig_OnGET;
}(RouteConfig_Core));
