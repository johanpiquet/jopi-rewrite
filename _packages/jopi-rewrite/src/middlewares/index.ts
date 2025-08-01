import DdosProtection from "./DdosProtection";
import type {JopiRequest} from "../core";
import CorsMiddleware from "./CorsMiddleware";

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