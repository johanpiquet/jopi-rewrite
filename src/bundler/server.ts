import {JopiRequest} from "../jopiRequest.ts";
import {getBundleDirPath} from "./common.ts";
import {type WebSite, WebSiteImpl} from "../jopiWebSite.js";

export async function handleBundleRequest(req: JopiRequest): Promise<Response> {
    req.urlInfos.pathname = req.urlInfos.pathname.substring("/_bundle".length);

    return req.serverFromDir(gDirToServe!);
}

export function getBundleUrl(webSite: WebSite): string {
    return (webSite as WebSiteImpl).welcomeUrl + "/_bundle";
}

export function configureServer(dirPath: string, entryPointFileName: string) {
    gDirToServe = dirPath;
    gEntryPointFileName = entryPointFileName;
}

export function getBundleEntryPointUrl(webSite: WebSite): string {
    return getBundleUrl(webSite) + '/' + gEntryPointFileName;
}

let gDirToServe: string|undefined;
let gEntryPointFileName: string|undefined;