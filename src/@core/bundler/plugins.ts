import * as jk_fs from "jopi-toolkit/jk_fs";

export interface LoaderScriptPluginsParams {
    tplPlugins: string;
    tplImport: string;
    tplDeclarations: string;
    tplInit: string;
    outDir: string;
}

const gPlugins: LoaderScriptPlugin[] = [];
type LoaderScriptPlugin = (params: LoaderScriptPluginsParams) => Promise<void>;

export function addLoaderScriptPlugin(plugin: LoaderScriptPlugin) {
    gPlugins.push(plugin);
}

export function getScriptPlugins() {
    return gPlugins;
}

export async function loadCodeGenTemplate(name: string): Promise<string> {
    let resolvedPath = jk_fs.join(import.meta.dirname, "templates", name);
    let toSearch = jk_fs.join("dist", "@core", "bundler");
    let replaceBy = jk_fs.join("src", "@core", "bundler");
    if (resolvedPath.includes(toSearch)) resolvedPath = resolvedPath.replace(toSearch, replaceBy);

    return await jk_fs.readTextFromFile(resolvedPath);
}