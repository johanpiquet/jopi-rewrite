import DdosProtection from "./DdosProtection.ts";
import CorsMiddleware from "./CorsMiddleware.ts";
export var Middlewares = {
    ddosProtection: DdosProtection,
    requestTimeout_sec: function (timeInSec) { return function (req) {
        req.extendTimeout_sec(timeInSec);
        return null;
    }; }
};
export var PostMiddlewares = {
    cors: CorsMiddleware
};
