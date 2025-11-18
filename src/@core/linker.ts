import {type InstallFunction, loadServerInstall, getBrowserInstallFunction, getDefaultLinkerConfig, compile} from "jopi-rewrite/linker";
import {ModuleInitContext} from "jopi-rewrite/ui";
import * as jk_events from "jopi-toolkit/jk_events";
import {JopiEasyWebSite, type WebSite} from "jopi-rewrite";

let gBrowserInstallFunction: InstallFunction<ModuleInitContext>;
let gIsInit = false;

export async function initLinker(webSite: JopiEasyWebSite, onWebSiteCreate: (h: (webSite: WebSite) => void|Promise<void>) => void) {
    if (gIsInit) return;
    gIsInit = true;

    await compile(import.meta, getDefaultLinkerConfig());
    gBrowserInstallFunction = await getBrowserInstallFunction();

    await loadServerInstall(webSite, onWebSiteCreate);
}

export function executeBrowserInstall(ctx: ModuleInitContext) {
    if (!gIsInit) return;
    gBrowserInstallFunction(ctx);
}

// Will allows updating shared components and composites.
jk_events.addListener("jopi.bundler.watch.beforeRebuild", async () => {
    debugger;
    await compile(import.meta, getDefaultLinkerConfig());
});