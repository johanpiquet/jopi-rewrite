import DdosProtection from "./DdosProtection.js";
import CorsMiddleware from "./CorsMiddleware.js";
export const Middlewares = {
    ddosProtection: DdosProtection,
    requestTimeout_sec: (timeInSec) => (req) => {
        req.extendTimeout_sec(timeInSec);
        return null;
    }
};
export const PostMiddlewares = {
    cors: CorsMiddleware
};
//# sourceMappingURL=index.js.map