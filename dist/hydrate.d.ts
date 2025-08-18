import { type JopiRequest, WebSite } from "./core.tsx";
export declare function getBundleUrl(webSite: WebSite): string;
export declare function createBundle(webSite: WebSite): Promise<void>;
export declare function handleBundleRequest(req: JopiRequest): Promise<Response>;
export declare function hasHydrateComponents(): boolean;
export declare function getHydrateComponents(): {
    [key: string]: string;
};
