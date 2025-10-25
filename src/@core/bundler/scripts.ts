import * as jk_app from "jopi-toolkit/jk_app";
import * as jk_fs from "jopi-toolkit/jk_fs";
import * as jk_events from "jopi-toolkit/jk_events";

import {pathToFileURL} from "node:url";
import {getBundlerConfig} from "./config.ts";
import {generateLoaderJsxCode} from "../linker.ts";
import {getScriptPlugins, loadCodeGenTemplate, type LoaderScriptPluginsParams} from "./plugins.ts";

const isWin32 = process.platform == "win32";

export async function generateScript_loaderJsx(genDir: string, components: {[key: string]: string}, extraCssToBundle: string[]): Promise<string> {
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

        //region Jopi Linker

        tplInit += generateLoaderJsxCode();

        //endregion

        //region Load plugins

        let pluginParams: LoaderScriptPluginsParams = {
            tplPlugins, tplInit, tplImport, tplDeclarations, outDir: genDir,
        }

        for (let plugin of getScriptPlugins()) {
            await plugin(pluginParams);
        }

        await jk_events.sendAsyncEvent("jopi.bundler.creatingScript", pluginParams);

        tplInit = pluginParams.tplInit;
        tplPlugins = pluginParams.tplPlugins;
        tplImport = pluginParams.tplImport;
        tplDeclarations = pluginParams.tplDeclarations;

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

