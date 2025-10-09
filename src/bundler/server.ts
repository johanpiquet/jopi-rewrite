import {JopiRequest} from "../jopiRequest.ts";
import {calculateWebSiteTempDir} from "./common.ts";
import {type WebSite, WebSiteImpl} from "../jopiWebSite.js";

export async function handleBundleRequest(req: JopiRequest): Promise<Response> {
    req.urlInfos.pathname = req.urlInfos.pathname.substring("/_bundle".length);

    return req.serverFromDir(calculateWebSiteTempDir(req.webSite));
}

export function getBundleUrl(webSite: WebSite) {
    return (webSite as WebSiteImpl).welcomeUrl + "/_bundle";
}