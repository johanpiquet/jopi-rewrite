import {type InstallFunction, loadServerInstall, getBrowserInstallFunction, getDefaultLinkerConfig, compile, getBrowserInstallScript} from "jopi-rewrite/linker";
import {ModuleInitContext} from "jopi-rewrite/ui";
import type { WebSite } from "./jopiWebSite.ts";

let gBrowserInstallFunction: InstallFunction<ModuleInitContext>;
let gIsInit = false;

export async function initLinker(webSite: WebSite) {
    if (gIsInit) return;
    gIsInit = true;

    await compile(import.meta, getDefaultLinkerConfig());
    gBrowserInstallFunction = await getBrowserInstallFunction();

    await loadServerInstall(webSite);
}

export function executeBrowserInstall(ctx: ModuleInitContext) {
    if (!gIsInit) return;
    gBrowserInstallFunction(ctx);
}