import path from "node:path";

import React from "react";
import {type JopiRequest, type WebSite, WebSiteImpl} from "./core.tsx";
import {setNewHydrateListener, setNewMustBundleExternalCssListener, useCssModule} from "jopi-rewrite-ui";
import {esBuildBundle, jopiReplaceServerPlugin} from "./bundler_esBuild.ts";
import {esBuildBundleExternal} from "./bundler_esBuildExternal.ts";
import fs from "node:fs/promises";
import {scssToCss, searchSourceOf} from "@jopi-loader/tools";
import {fileURLToPath, pathToFileURL} from "node:url";

import postcss from 'postcss';
import tailwindPostcss from '@tailwindcss/postcss';
import type {Config as TailwindConfig} from 'tailwindcss';
import {serverInitChrono} from "./internalHelpers.js";

const nFS = NodeSpace.fs;
const nCrypto = NodeSpace.crypto;

const isWin32 = process.platform == "win32";

//region Bundle

async function generateScript(outputDir: string, components: {[key: string]: string}): Promise<string> {
    try {
        let declarations = "";

        for (const componentKey in components) {
            let componentPath = await searchSourceOf(components[componentKey]);

            // Patch for windows. Require a linux-like path.
            if (isWin32) componentPath = pathToFileURL(componentPath).href.substring("file:///".length);

            declarations += `\njopiHydrate.components["${componentKey}"] = lazy(() => import("${componentPath}"));`;
        }

        let resolvedPath = import.meta.resolve("./../src/template.jsx");
        resolvedPath = NodeSpace.fs.fileURLToPath(resolvedPath);

        let template = await NodeSpace.fs.readTextFromFile(resolvedPath);
        let script = template.replace("//[DECLARE]", declarations);

        const filePath = path.join(outputDir, "loader.jsx");
        await NodeSpace.fs.writeTextToFile(filePath, script, true);

        return filePath;
    }
    catch (e) {
        console.error("Error generating loader.jsx", e);
        throw e;
    }
}

export function getBundleUrl(webSite: WebSite) {
    return (webSite as WebSiteImpl).welcomeUrl + "/_bundle";
}

export async function createBundle(webSite: WebSite): Promise<void> {
    serverInitChrono.start("createBrowserBundle", "Time for building browser bundler")

    try {
        if (NodeSpace.what.isBunJs) {
            await createBundle_esbuild(webSite);
        } else {
            // With node.js, import for CSS and other are not supported.
            //
            // It's why:
            // - A special loader allows ignoring it.
            // - But EsBuild can't execute from this base code.
            // ==> We must execute it from a separate process.
            //
            await createBundle_esbuild_external(webSite);
        }
    }
    catch (e) {
        console.error("Error executing EsBuild", e);
    }

    serverInitChrono.end();
}

async function createBundle_esbuild_external(webSite: WebSite): Promise<void> {
    const components = getHydrateComponents();
    const outputDir = calculateWebSiteTempDir(webSite);

    if (hasHydrateComponents()) {
        const publicUrl = (webSite as WebSiteImpl).welcomeUrl + '/_bundle/';

        // Empty the dir, this makes tests easier.
        await nFS.rmDir(gTempDirPath);
        await nFS.mkDir(gTempDirPath);

        const entryPoint = await generateScript(outputDir, components);

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

    await postProcessCreateBundle(webSite, outputDir, Object.values(components));
}

function calculateWebSiteTempDir(webSite: WebSite) {
    return path.join(gTempDirPath, (webSite as WebSiteImpl).host)
            .replaceAll(".", "_").replaceAll(":", "_");
}

async function createBundle_esbuild(webSite: WebSite): Promise<void> {
    const components = getHydrateComponents();
    const outputDir = calculateWebSiteTempDir(webSite);

    if (hasHydrateComponents()) {
        const entryPoint = await generateScript(outputDir, components);
        const publicUrl = (webSite as WebSiteImpl).welcomeUrl + '/_bundle/';

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
    }

    await postProcessCreateBundle(webSite, outputDir, Object.values(components));
}

async function postProcessCreateBundle(webSite: WebSite, outputDir: string, sourceFiles: string[]) {
    // Prefer the sources if possible.
    sourceFiles = await Promise.all(sourceFiles.map(searchSourceOf))

    //region Creates the CSS bundle (include Tailwind CSS).

    // Jopi Loader hooks the CSS. It's why EsBuild can't automatically catch the CSS.
    // And why, here we bundle it manually.

    const outFilePath = path.resolve(outputDir, "loader.css");

    await nFS.mkDir(outputDir);

    if (await nFS.isFile(outFilePath)) {
        await nFS.unlink(outFilePath);
    }

    // Assure the file exists.
    await fs.appendFile(outFilePath, "", "utf-8");

    let postCss = await applyPostCss(sourceFiles);
    if (postCss) await fs.appendFile(outFilePath, postCss, "utf-8");

    for (const cssFilePath of gAllCssFiles) {
        let css: string;

        if (cssFilePath.endsWith(".scss")) {
            css = scssToCss(cssFilePath);
        } else {
            css = await nFS.readTextFromFile(cssFilePath);
        }

        await fs.appendFile(outFilePath, css, "utf-8");
    }

    //endregion

    const loaderHash: any = {};
    webSite.data["jopiLoaderHash"] = loaderHash;

    // Calculate the hash.
    loaderHash.css = NodeSpace.crypto.md5(await nFS.readTextFromFile(path.join(outputDir, "loader.css")));

    // The file doesn't exist if we don't use hydrate components.
    //
    let jsFilePath = path.join(outputDir, "loader.js");
    if (!await nFS.isFile(path.join(outputDir, "loader.js"))) await nFS.writeTextToFile(jsFilePath, "");
    loaderHash.js = NodeSpace.crypto.md5(await nFS.readTextFromFile(path.join(outputDir, "loader.js")));
}

export async function handleBundleRequest(req: JopiRequest): Promise<Response> {
    /*const pathName = req.urlInfos.pathname;
    let idx = pathName.lastIndexOf("/");
    const fileName = pathName.substring(idx);
    const filePath = path.resolve(path.join(gTempDirPath, (req.webSite as WebSiteImpl).host, fileName));

    let contentType = nFS.getMimeTypeFromName(filePath);
    let isJS = false;

    if (contentType.startsWith("text/javascript")) {
        isJS = true;
        contentType = "application/javascript;charset=utf-8";
    }

    try {
        let content = await nFS.readTextFromFile(filePath);
        if (isJS) content = content.replaceAll("import.meta", "''");
        return new Response(content, {status: 200, headers: {"content-type": contentType}});
    }
    catch {
        return new Response("", {status: 404});
    }*/

    req.urlInfos.pathname = req.urlInfos.pathname.substring("/_bundle".length);

    return req.serveFile(calculateWebSiteTempDir(req.webSite));
}

/**
 * Generate Tailwind CSS file a liste of source files, and returns the CSS or undefined.
 * @param sourceFiles
 *      The list of source files. It's .tsx files.
 * @returns
 *       The CSS or undefined.
 */
async function applyPostCss(sourceFiles: string[]): Promise<string|undefined> {
    if (!sourceFiles.length) return "";

    let plugins: postcss.AcceptedPlugin[] = [];

    let tailwindPlugins = gConfig_disableTailwind ?
        undefined : tailwindPostcss({
            content: sourceFiles,
            theme: {extend: {}},
            plugins: [],
            ...gConfig_tailwindConfig
        } as any)

    if (gConfig_postCssPluginsInitializer) {
        plugins = gConfig_postCssPluginsInitializer(sourceFiles, tailwindPlugins);
    } else if (tailwindPlugins) {
        plugins = [tailwindPlugins];
    } else {
        return undefined;
    }

    if (!plugins.length) return undefined;

    try {
        const processor = postcss(plugins);

        const result = await processor.process(gConfig_tailwindTemplate, {
            // Setting from allows resolving correctly the node_modules resolving.
            // Without that, the compiler emits an error saying he doesn't found his
            // dependencies (he searches package.json in the bad folder, is ok in monorep
            // but ko in a solo project).
            //
            from: path.resolve(sourceFiles[0])
        });

        return result.css;
    }
    catch (e: any) {
        console.error("Error while compiling for Tailwind:", e);
        return undefined;
    }
}

// @ts-ignore Is called by jopi-loader when found a CSS/SCSS file which isn't a module.
global.jopiOnCssImported = function(cssFilePath: string) {
    addCssToBundle(cssFilePath);
}

// Don't use node_modules, because of a bug when using workspaces.
// This bug is doing that WebStorm doesn't resolve the file to his real location
// but to the workspace node_modules (and not the project inside the workspace).
//
// TODO: allow configuring it.
//
let gTempDirPath = path.resolve(process.cwd(), "temp", ".reactHydrateCache");

const gAllCssFiles: string[] = [];

//endregion

//region UI

export function hasHydrateComponents() {
    return gHasComponents;
}

export function hasExternalCssBundled() {
    return gHasManuallyIncludedCss;
}

export function getHydrateComponents() {
    return gHydrateComponents;
}

interface JopiHydrateProps {
    Child: React.FunctionComponent;
    args: any;
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

function JopiHydrate({id, args, asSpan, Child}: JopiHydrateProps) {
    const props = {"jopi-hydrate": JSON.stringify({id, args})};

    if (asSpan) {
        return <span {...props}><Child {...args}>{}</Child></span>;
    }

    return <div {...props}><Child {...args}>{}</Child></div>;
}

function onNewHydrate(importMeta: {filename: string}, f: React.FunctionComponent, isSpan: boolean, cssModules?: Record<string, string>): React.FunctionComponent {
    // Register the component.
    const id = useHydrateComponent(importMeta);

    // Wrap our component.
    return (p: any) => {
        return <>
            {useCssModule(cssModules)}
            <JopiHydrate id={id} args={p} asSpan={isSpan} Child={f as React.FunctionComponent}/>
        </>;
    }
}

async function onNewMustIncludeCss(importMeta: {filename: string}, cssFilePath: string) {
    // Resolve the file path, which must be a file url, absolute or relative.

    let cssFileUrl: string;

    if (cssFilePath.startsWith("file:/")) {
        cssFileUrl = cssFilePath;
    } else {
        if (!cssFilePath.startsWith("./")) {
            console.error("* CSS file must starts with 'file:/' or './'\n|- See:", await searchSourceOf(importMeta.filename));
        }

        let dirPath = path.dirname(importMeta.filename);
        cssFileUrl = pathToFileURL(dirPath).href + '/' + cssFilePath;
    }

    cssFilePath = fileURLToPath(cssFileUrl);

    // If using a TypeScript compiler, then the CSS remain in the source folder.
    cssFilePath = await searchSourceOf(cssFilePath);

    if (!await nFS.isFile(cssFilePath)) {
        console.warn("JopiHydrate: CSS file not found:", cssFilePath);
        return;
    }

    addCssToBundle(cssFilePath);
}

function addCssToBundle(cssFilePath: string) {
    gHasManuallyIncludedCss = true;
    if (gAllCssFiles.includes(cssFilePath)) return;
    gAllCssFiles.push(cssFilePath);
}

const gHydrateComponents: {[key: string]: string} = {};
let gHasComponents = false;
let gHasManuallyIncludedCss = false;

setNewHydrateListener(onNewHydrate);
setNewMustBundleExternalCssListener(onNewMustIncludeCss);

//endregion

//region Config

export type PostCssInitializer = (sources: string[], tailwindPluging:  postcss.AcceptedPlugin|undefined) => postcss.AcceptedPlugin[];

let gConfig_tailwindTemplate: string = `@import "tailwindcss";`;
let gConfig_disableTailwind = false;
let gConfig_tailwindConfig: TailwindConfig|undefined;
let gConfig_postCssPluginsInitializer: undefined|PostCssInitializer;

export function setConfig_setTailwindConfig(config: TailwindConfig) {
    gConfig_tailwindConfig = config;
}

export function setConfig_disableTailwind() {
    gConfig_disableTailwind = true;
}

export function setConfig_setTailwindTemplate(template: string) {
    gConfig_tailwindTemplate = template;
}

export function setConfig_postCssPluginsInitializer(handler: PostCssInitializer) {
    gConfig_postCssPluginsInitializer = handler;
}

//endregion