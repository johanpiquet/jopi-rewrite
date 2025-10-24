import {type InstallFunction, loadServerInstall, getBrowserInstallFunction, InstallFileType, setInstallerTemplate, compile, getBrowserInstallScript} from "jopi-rewrite/linker";
import {ModuleInitContext_UI} from "jopi-rewrite/ui";
import type { WebSite } from "./jopiWebSite.ts";

let gBrowserInstallFunction: InstallFunction<ModuleInitContext_UI>;
let gIsInit = false;

function installTemplates() {
    setInstallerTemplate(InstallFileType.browser,
        `import {ModuleInitContext_UI} from "jopi-rewrite/ui";
__HEADER

export default function(registry: ModuleInitContext_UI) {
__BODY__FOOTER
}`);

    setInstallerTemplate(InstallFileType.server,
        `import type {WebSite} from "jopi-rewrite";
__HEADER
        
export default async function(registry: WebSite) {
__BODY__FOOTER
}`);
}

export async function initLinker(webSite: WebSite) {
    if (gIsInit) return;
    gIsInit = true;

    installTemplates();

    let hasChanges = await compile();

    if (hasChanges) {
        console.error("⚠️⚠️  Jopi Linker has detected changes and rebuild.");
        console.error("⚠️⚠️  You must restart the application.");

        // This code allows the launcher to know that a restart is required.
        process.exit(450);
    }

    gBrowserInstallFunction = await getBrowserInstallFunction();

    await loadServerInstall(webSite);
}

export function executeBrowserInstall(ctx: ModuleInitContext_UI) {
    if (!gIsInit) return;
    gBrowserInstallFunction(ctx);
}

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