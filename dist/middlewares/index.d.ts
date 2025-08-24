import DdosProtection from "./DdosProtection.ts";
import type { JopiRequest } from "../core.tsx";
import CorsMiddleware from "./CorsMiddleware.ts";
export declare const Middlewares: {
    ddosProtection: typeof DdosProtection;
    requestTimeout_sec: (timeInSec: number) => (req: JopiRequest) => null;
};
export declare const PostMiddlewares: {
    cors: typeof CorsMiddleware;
};
