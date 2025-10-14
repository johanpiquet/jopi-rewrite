import {type WebSite, WebSiteImpl} from "../jopiWebSite.js";
import path from "node:path";
import * as ns_app from "jopi-node-space/ns_app";

export function getBundleDirPath(webSite: WebSite) {
    // To known: the loader uses jopi.webSiteUrl from "package.json".
    // This can create a situation where we have 2 output directories for
    // the same website.
    //
    let webSiteHost = (webSite as WebSiteImpl).host.replaceAll(".", "_").replaceAll(":", "_");
    return path.join(gTempDirPath, webSiteHost);
}

// Don't use node_modules because of a bug when using workspaces.
// This bug is doing that WebStorm doesn't resolve the file to his real location
// but to the workspace node_modules (and not the project inside the workspace).
//
let gTempDirPath = path.resolve(ns_app.getTempDir(), ".reactHydrateCache");
