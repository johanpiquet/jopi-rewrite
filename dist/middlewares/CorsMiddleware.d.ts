import type { JopiPostMiddleware } from "../core.tsx";
export interface CorsMiddlewareOptions {
    accessControlAllowOrigin?: string[];
}
export default function (options: CorsMiddlewareOptions): JopiPostMiddleware;
