import {JopiRequest} from "../jopiRequest.ts";
import {type WebSite, WebSiteImpl} from "../jopiWebSite.js";

export async function handleBundleRequest(req: JopiRequest): Promise<Response> {
    req.urlInfos.pathname = req.urlInfos.pathname.substring("/_bundle".length);

    return req.serverFromDir(gDirToServe!);
}

function getBundleUrl(webSite: WebSite): string {
    return (webSite as WebSiteImpl).welcomeUrl + "/_bundle";
}

export function getBundleEntryPointUrl_JS(webSite: WebSite): string {
    return getBundleUrl(webSite) + '/' + gJsEntryPointFileName;
}

export function getBundleEntryPointUrl_CSS(webSite: WebSite): string {
    return getBundleUrl(webSite) + '/' + gCssEntryPointFileName;
}

export function configureServer(dirPath: string, jsEntryPointFileName: string, cssEntryPointFileName?: string) {
    gDirToServe = dirPath;
    gJsEntryPointFileName = jsEntryPointFileName;
    gCssEntryPointFileName = cssEntryPointFileName;
}

let gDirToServe: string|undefined;
let gJsEntryPointFileName: string|undefined;
let gCssEntryPointFileName: string|undefined;