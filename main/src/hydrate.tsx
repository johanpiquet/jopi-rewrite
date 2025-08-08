import path from "node:path";
import sourceMap from "source-map";

import React from "react";
import {type JopiRequest, WebSite} from "./core.ts";
import {setNewHydrateListener} from "jopi-rewrite-ui";
import {esBuildBundle, jopiReplaceServerPlugin} from "./bundler_esBuild.ts";
import {esBuildBundleExternal} from "./bundler_esBuildExternal.ts";

const nFS = NodeSpace.fs;
const nCrypto = NodeSpace.crypto;
const isNodeJs = NodeSpace.what.isNodeJS;

//region Bundle

/**
 * Search the source of the component if it's a javascript and not a typescript.
 */
async function searchSourceOf(scriptPath: string) {
    async function tryResolve(tsFile: string, outDir: string) {
        let out = path.sep + outDir + path.sep;
        let idx = tsFile.lastIndexOf(out);

        if (idx !== -1) {
            tsFile = tsFile.slice(0, idx) + "/src/" + tsFile.slice(idx + out.length);

            if (await nFS.isFile(tsFile)) return tsFile;
            tsFile += "x";
            if (await nFS.isFile(tsFile)) return tsFile;
        }

        return undefined;
    }

    if (!isNodeJs) return scriptPath;
    if (!scriptPath.endsWith(".js")) return scriptPath;

    let tsFile = scriptPath.slice(0, -2) + "ts";
    if (await nFS.isFile(tsFile)) return tsFile;

    let found = await tryResolve(tsFile, "dist");
    if (found) return found;

    found = await tryResolve(tsFile, "build");
    if (found) return found;

    return scriptPath;
}

async function generateScript(outputDir: string, components: {[key: string]: string}): Promise<string> {
    let declarations = "";

    for (const componentKey in components) {
        const componentPath = await searchSourceOf(components[componentKey]);
        declarations += `\njopiHydrate.components["${componentKey}"] = lazy(() => import("${componentPath}"));`;
    }

    let resolvedPath: string;

    if (NodeSpace.what.isNodeJS) {
        resolvedPath = import.meta.resolve("./../src/template.jsx");
    } else {
        resolvedPath = import.meta.resolve("./../src/template.jsx");
    }

    resolvedPath = NodeSpace.fs.fileURLToPath(resolvedPath);
    let template = await NodeSpace.fs.readTextFromFile(resolvedPath);
    let script = template.replace("//[DECLARE]", declarations);

    const filePath = path.join(outputDir, "loader.jsx");
    await NodeSpace.fs.writeTextToFile(filePath, script, true);

    return filePath;
}

export function getBundleUrl(webSite: WebSite) {
    return webSite.welcomeUrl + "/_bundle";
}

export async function createBundle(webSite: WebSite): Promise<void> {
    if (NodeSpace.what.isBunJs) {
        return createBundle_esbuild(webSite);
    } else {
        // With node.js, import for CSS and other are not supported.
        //
        // It's why:
        // - A special loader allows ignoring it.
        // - But EsBuild can't execute from this base code.
        // ==> We must execute it from a separate process.
        //
        return createBundle_esbuild_external(webSite);
    }

    //return createBundle_esbuild(webSite);
}

async function createBundle_esbuild_external(webSite: WebSite): Promise<void> {
    if (!hasHydrateComponents()) return;

    const components = getHydrateComponents();
    const outputDir = path.join(gTempDirPath, webSite.hostName);
    const entryPoint = await generateScript(outputDir, components);
    const publicUrl = webSite.welcomeUrl + '/_bundle/';

    await esBuildBundleExternal({
        entryPoint, outputDir,
        publicPath: publicUrl,
        usePlugins: ["jopiReplaceServerPlugin"],

        overrideConfig: {
            platform: 'browser',
            bundle: true,
            format: 'esm',
            target: "es2020",
            splitting: true
        }
    });
}

async function createBundle_esbuild(webSite: WebSite): Promise<void> {
    if (!hasHydrateComponents()) return;

    const components = getHydrateComponents();
    const outputDir = path.join(gTempDirPath, webSite.hostName);
    const entryPoint = await generateScript(outputDir, components);
    const publicUrl = webSite.welcomeUrl + '/_bundle/';

    await esBuildBundle({
        entryPoint, outputDir,
        publicPath: publicUrl,
        plugins: [jopiReplaceServerPlugin],

        overrideConfig: {
            platform: 'browser',
            bundle: true,
            format: 'esm',
            target: "es2020",
            splitting: true
        }
    });

    if (gOverrideBundleCss) {
        try {
            const cssFilePath = path.join(outputDir, "loader.css");
            const cssContent = await nFS.readTextFromFile(gOverrideBundleCss);
            await nFS.writeTextToFile(cssFilePath, cssContent);
        }
        catch(e) {
            console.error(e);
        }
    }
}

export async function handleBundleRequest(req: JopiRequest): Promise<Response> {
    const pathName = req.urlInfos.pathname;
    let idx = pathName.lastIndexOf("/");
    const fileName = pathName.substring(idx);
    const filePath = path.resolve(path.join(gTempDirPath, req.webSite.hostName, fileName));

    let contentType = nFS.getMimeTypeFromName(filePath);
    let isJS = false;

    if (contentType.startsWith("text/javascript")) {
        isJS = true;
        contentType = "application/javascript;charset=utf-8";
    }

    try {
        let content = await nFS.readTextFromFile(filePath);

        if (isJS) {
            content = content.replaceAll("import.meta", "''");
        }

        return new Response(
            content,
            {
                status: 200,
                headers: {
                    "content-type": contentType,
                    // "content-length": "" + file.size
                }
            });
    }
    catch {
        return new Response("", {status: 404});
    }
}

export function overrideBundleCss(cssFilePath: string) {
    gOverrideBundleCss = cssFilePath;
}

let gOverrideBundleCss: string|undefined;
let gTempDirPath = path.join("node_modules", ".reactHydrateCache");

//endregion

//region UI

export function hasHydrateComponents() {
    return gHasComponents;
}

export function getHydrateComponents() {
    return gHydrateComponents;
}

interface JopiHydrateProps {
    Child: React.FunctionComponent;
    args: any,
    id: string;
    asSpan: boolean;
}

function useHydrateComponent(importMeta: { filename: string }): string {
    if (NodeSpace.what.isServerSide) {
        const key = nCrypto.fastHash(importMeta.filename).toString();
        const filePath = importMeta.filename;

        const currentFilePath = gHydrateComponents[key];
        if (currentFilePath === filePath) return key;
        if (currentFilePath) throw new Error(`JopiHydrate: key ${key} already registered with ${currentFilePath}`);

        gHasComponents = true;
        gHydrateComponents[key] = filePath;

        return key;
    }

    return "";
}

function JopiHydrate({id, args, asSpan, Child,}: JopiHydrateProps) {
    const props = {"jopi-hydrate": JSON.stringify({id, args})};

    if (asSpan) {
        return <span {...props}><Child {...args}>{}</Child></span>;
    }

    return <div {...props}><Child {...args}>{}</Child></div>;
}

function onNewHydrate(importMeta: {filename: string}, f: React.FunctionComponent, isSpan: boolean): React.FunctionComponent {
    // Register the component.
    const id = useHydrateComponent(importMeta);

    // Wrap our component.
    return (p:any) => <JopiHydrate id={id} args={p} asSpan={isSpan} Child={f as React.FunctionComponent} />;
}

const gHydrateComponents: {[key: string]: string} = {};
let gHasComponents = false;

setNewHydrateListener(onNewHydrate);

//endregion