import * as jk_app from "jopi-toolkit/jk_app";
import * as jk_fs from "jopi-toolkit/jk_fs";
import {pathToFileURL} from "node:url";
import {getAllUiComposites, getGlobalUiInitFiles, getUiCompositeItems, getUiInitFiles} from "../modulesManager.js";
import {getBundlerConfig} from "./config.ts";

const isWin32 = process.platform == "win32";

const gGenerateScriptPlugins: GeneratedScriptPlugin[] = [];
type GeneratedScriptPlugin = (script: string, outDir: string) => Promise<string>;

export async function generateScript(genDir: string, components: {[key: string]: string}, extraCssToBundle: string[]): Promise<string> {
    const config = getBundlerConfig();
    let enableReactRouter = config.reactRouter.disable!==true;

    try {
        let tplDeclarations = "";
        let tplInit = "";
        let tplPlugins = "";
        let tplImport = "";

        //region Import CSS

        if (enableReactRouter) {
            tplImport += `import {Page} from "jopi-rewrite/ui";\n`;
            tplImport += `import {createBrowserRouter, RouterProvider} from "react-router";\n`;
        }

        for (const cssPath of extraCssToBundle) {
            tplImport += `import "${cssPath}";\n`;
        }

        //endregion

        //region Adds key to components binding

        for (const componentKey in components) {
            let componentPath = jk_app.requireSourceOf(components[componentKey]);

            // Patch for windows. Require a linux-like path.
            if (isWin32) componentPath = pathToFileURL(componentPath).href.substring("file:///".length);

            tplDeclarations += `\njopiHydrate.components["${componentKey}"] = lazy(() => import("${componentPath}"));`;
        }

        //endregion

        //region Add composite components

        for (const compositeName in getAllUiComposites()) {
            const items = getUiCompositeItems(compositeName);

            tplDeclarations += `\n\njopiComposites["${compositeName}"] = [`

            for (let item of items) {
                tplDeclarations += `\n    lazy(() => import("${item.filePath}")),`;
            }

            tplDeclarations += `\n];`
        }

        //endregion

        //region Add global UI init

        for (const globalScript of getGlobalUiInitFiles()) {
            tplImport += `\nimport "${globalScript}";`;
        }

        //endregion

        //region Add initialisation steps

        let tplModulesInit = "Promise.all([";

        // Module init scripts.
        for (const uiInit of getUiInitFiles()) {
            tplModulesInit += `\nmod_initializeMod((await import("${uiInit}")).default),`;
        }

        tplModulesInit += "\n]).then(mod_onAllModInitialized)";

        tplInit += tplModulesInit;

        //endregion

        //region Load plugins

        for (let plugin of gGenerateScriptPlugins) {
            tplPlugins = await plugin(tplPlugins, genDir);
        }

        //endregion

        let script = await loadCodeGenTemplate("template_main.jsx");
        script = script.replace("//[IMPORT]", tplImport);
        script = script.replace("//[DECLARE]", tplDeclarations);
        script = script.replace("//[ON_INIT]", tplInit);
        script = script.replace("//[PLUGINS]", tplPlugins);

        const filePath = jk_fs.join(genDir, "loader.jsx");
        await jk_fs.writeTextToFile(filePath, script, true);

        return filePath;
    }
    catch (e) {
        console.error("Error generating loader.jsx", e);
        throw e;
    }
}

export function addGenerateScriptPlugin(plugin: GeneratedScriptPlugin) {
    gGenerateScriptPlugins.push(plugin);
}

export async function loadCodeGenTemplate(name: string): Promise<string> {
    let resolvedPath = jk_fs.join(import.meta.dirname, "templates", name);
    let toSearch = jk_fs.join("dist", "@core", "bundler");
    let replaceBy = jk_fs.join("src", "@core", "bundler");
    if (resolvedPath.includes(toSearch)) resolvedPath = resolvedPath.replace(toSearch, replaceBy);

    return await jk_fs.readTextFromFile(resolvedPath);
}