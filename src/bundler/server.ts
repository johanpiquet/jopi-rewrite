import {type WebSite, WebSiteImpl} from "../jopiWebSite.js";
import {getVirtualUrlMap, type VirtualUrlEntry} from "./extraContent.js";

export function installBundleServer(webSite: WebSite) {
    const virtualRoutes = getVirtualUrlMap();

    webSite.onGET("/_bundle/**", async (req) => {
        req.urlInfos.pathname = req.urlInfos.pathname.substring("/_bundle".length);
        return req.serverFromDir(gDirToServe!);
    });

    virtualRoutes.forEach(e => addVirtualUrl(webSite, e));
}

function addVirtualUrl(webSite: WebSite, entry: VirtualUrlEntry) {
    if (!entry.bundleFile) return;

    const toServe = entry.bundleFile;
    webSite.onGET(entry.route, async req => {
        return req.returnFile(toServe);
    });
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