import { addRoute, createRouter, findRoute } from "rou3";
/**
 * Allows knowing how to map the url.
 * This allows mixing more than one website.
 */
var UrlMapping = /** @class */ (function () {
    function UrlMapping(defaultTarget) {
        this.router = createRouter();
        this.allOrigins = [];
        this.defaultTarget = this.cleanUpRoute(defaultTarget);
    }
    UrlMapping.prototype.cleanUpRoute = function (route) {
        if (route.endsWith("/*"))
            return route.slice(0, -2);
        if (route.endsWith("/**"))
            return route.slice(0, -3);
        if (route.endsWith("/"))
            return route.slice(0, -1);
        return route;
    };
    UrlMapping.prototype.getKnownOrigins = function () {
        return this.allOrigins;
    };
    UrlMapping.prototype.mapURL = function (route, mapTo, wakeUpServer) {
        // Avoid errors.
        mapTo = this.cleanUpRoute(mapTo);
        route = this.cleanUpRoute(route) + "/**";
        var mapToOrigin = new URL(mapTo).origin;
        if (!this.allOrigins.includes(mapToOrigin))
            this.allOrigins.push(mapToOrigin);
        addRoute(this.router, "GET", route, {
            url: mapTo,
            wakeUpServer: wakeUpServer
        });
        return this;
    };
    UrlMapping.prototype.resolveURL = function (url) {
        var matched = findRoute(this.router, "GET", url);
        var target;
        var wakeUpServer;
        if (!matched) {
            target = this.defaultTarget;
        }
        else {
            target = matched.data.url;
            wakeUpServer = matched.data.wakeUpServer;
        }
        return { url: target + url, wakeUpServer: wakeUpServer };
    };
    return UrlMapping;
}());
export { UrlMapping };
