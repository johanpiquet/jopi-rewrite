import DdosProtection from "./DdosProtection.ts";
import type {JopiRequest} from "../core.tsx";
import CorsMiddleware from "./CorsMiddleware.ts";

export const Middlewares = {
    ddosProtection: DdosProtection,

    requestTimeout_sec: (timeInSec:number) => (req: JopiRequest) => {
        req.extendTimeout_sec(timeInSec);
        return null;
    }
};

export const PostMiddlewares = {
    cors: CorsMiddleware
};