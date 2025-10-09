import NodeSpace, {nFS} from "jopi-node-space";
import {pathToFileURL} from "node:url";
import {getAllUiComposites, getUiCompositeItems, getUiInitFiles} from "../modulesManager.js";
import path from "node:path";

const isWin32 = process.platform == "win32";

const gGenerateScriptPlugins: GeneratedScriptPlugin[] = [];
type GeneratedScriptPlugin = (script: string, outDir: string) => Promise<string>;

export async function generateScript(outputDir: string, components: {[key: string]: string}): Promise<string> {
    try {
        let declarations = "";

        for (const componentKey in components) {
            let componentPath = NodeSpace.app.requireSourceOf(components[componentKey]);

            // Patch for windows. Require a linux-like path.
            if (isWin32) componentPath = pathToFileURL(componentPath).href.substring("file:///".length);

            declarations += `\njopiHydrate.components["${componentKey}"] = lazy(() => import("${componentPath}"));`;
        }

        //region UiComposites

        for (const compositeName in getAllUiComposites()) {
            const items = getUiCompositeItems(compositeName);

            declarations += `\n\njopiComposites["${compositeName}"] = [`

            for (let item of items) {
                declarations += `\n    lazy(() => import("${item.filePath}")),`;
            }

            declarations += `\n];`
        }

        //endregion

        let template = await loadCodeGenTemplate("template_main.jsx");

        let script = template.replace("//[DECLARE]", declarations);
        let scriptPlugins = "";

        for (let plugin of gGenerateScriptPlugins) {
            scriptPlugins = await plugin(scriptPlugins, outputDir);
        }

        //region ON_INIT

        let toImport = "Promise.all([";

        for (const uiInit of getUiInitFiles()) {
            toImport += `\nmod_initializeMod((await import("${uiInit}")).default),`;
        }
        toImport += "\n]).then(mod_onAllModInitialized)";

        script = script.replace("//[ON_INIT]", toImport);

        //endregion

        script = script.replace("//[PLUGINS]", scriptPlugins);

        const filePath = path.join(outputDir, "loader.jsx");
        await NodeSpace.fs.writeTextToFile(filePath, script, true);

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
    let resolvedPath = path.join(import.meta.dirname, "templates", name);
    let toSearch = path.join("dist", "bundler");
    if (resolvedPath.includes(toSearch)) resolvedPath = resolvedPath.replace(toSearch, path.join("src", "bundler"));

    return await nFS.readTextFromFile(resolvedPath);
}