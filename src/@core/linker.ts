import {type InstallFunction, loadServerInstall, getBrowserInstallFunction, InstallFileType, setInstallerTemplate, compile, getBrowserInstallScript} from "jopi-rewrite/linker";
import {ModuleInitContext_UI} from "jopi-rewrite/ui";

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
        `__HEADER
        
export default function() {
__BODY__FOOTER
}`);
}

export async function initLinker() {
    if (gIsInit) return;
    gIsInit = true;

    // TODO : détecter si changement en calculant un MD5 sur chaque fichier généré et chaque lien créé.
    //        Si modifié, alors message + exit
    installTemplates();
    await compile();

    await loadServerInstall();
    gBrowserInstallFunction = await getBrowserInstallFunction();
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