import {type InstallFunction, loadServerInstall, getBrowserInstallFunction, getDefaultLinkerConfig, compile, getBrowserInstallScript} from "jopi-rewrite/linker";
import {ModuleInitContext_UI} from "jopi-rewrite/ui";
import type { WebSite } from "./jopiWebSite.ts";

let gBrowserInstallFunction: InstallFunction<ModuleInitContext_UI>;
let gIsInit = false;

export async function initLinker(webSite: WebSite) {
    if (gIsInit) return;
    gIsInit = true;

    await compile(import.meta, getDefaultLinkerConfig());
    gBrowserInstallFunction = await getBrowserInstallFunction();

    await loadServerInstall(webSite);
}

export function executeBrowserInstall(ctx: ModuleInitContext_UI) {
    if (!gIsInit) return;
    gBrowserInstallFunction(ctx);
}

/**
 * Generate a code section to add inside loader.jsx.
 * The goal is to loader "installBrowser.js".
 */
export function generateLoaderJsxCode(): string {
    if (!gIsInit) return "";
    let installScript = getBrowserInstallScript();

    // Warning: must be keep as-is to avoid behaviors with esbuild about import.default.
    //
    return `
    const imported = await import("${installScript}");
    const fct = imported.default;
    fct(createModuleInitContext())
    `;
}