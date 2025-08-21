import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import path from "node:path";
import React from "react";
import { WebSite } from "./core.js";
import { setNewHydrateListener, useCssModule } from "jopi-rewrite-ui";
import { esBuildBundle, jopiReplaceServerPlugin } from "./bundler_esBuild.js";
import { esBuildBundleExternal } from "./bundler_esBuildExternal.js";
import fs from "node:fs/promises";
import { scssToCss } from "@jopi-loader/tools";
import postcss from 'postcss';
import tailwindPostcss from '@tailwindcss/postcss';
const nFS = NodeSpace.fs;
const nCrypto = NodeSpace.crypto;
const isNodeJs = NodeSpace.what.isNodeJS;
//region Bundle
/**
 * Search the source of the component if it's a JavaScript and not a TypeScript.
 * Why? Because EsBuild doesn't work well on already transpiled code.
 */
async function searchSourceOf(scriptPath) {
    async function tryResolve(tsFile, outDir) {
        let out = path.sep + outDir + path.sep;
        let idx = tsFile.lastIndexOf(out);
        if (idx !== -1) {
            tsFile = tsFile.slice(0, idx) + "/src/" + tsFile.slice(idx + out.length);
            if (await nFS.isFile(tsFile))
                return tsFile;
            tsFile += "x";
            if (await nFS.isFile(tsFile))
                return tsFile;
        }
        return undefined;
    }
    if (!isNodeJs)
        return scriptPath;
    if (!scriptPath.endsWith(".js"))
        return scriptPath;
    let tsFile = scriptPath.slice(0, -2) + "ts";
    if (await nFS.isFile(tsFile))
        return tsFile;
    let found = await tryResolve(tsFile, "dist");
    if (found)
        return found;
    found = await tryResolve(tsFile, "build");
    if (found)
        return found;
    return scriptPath;
}
async function generateScript(outputDir, components) {
    let declarations = "";
    for (const componentKey in components) {
        const componentPath = await searchSourceOf(components[componentKey]);
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
export function getBundleUrl(webSite) {
    return webSite.welcomeUrl + "/_bundle";
}
export async function createBundle(webSite) {
    if (NodeSpace.what.isBunJs) {
        return createBundle_esbuild(webSite);
    }
    else {
        // With node.js, import for CSS and other are not supported.
        //
        // It's why:
        // - A special loader allows ignoring it.
        // - But EsBuild can't execute from this base code.
        // ==> We must execute it from a separate process.
        //
        return createBundle_esbuild_external(webSite);
    }
}
async function createBundle_esbuild_external(webSite) {
    if (!hasHydrateComponents())
        return;
    const components = getHydrateComponents();
    const outputDir = path.join(gTempDirPath, webSite.hostName);
    const publicUrl = webSite.welcomeUrl + '/_bundle/';
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
    await postProcessCreateBundle(webSite, outputDir, Object.values(components));
}
async function createBundle_esbuild(webSite) {
    if (!hasHydrateComponents())
        return;
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
    await postProcessCreateBundle(webSite, outputDir, Object.values(components));
}
async function postProcessCreateBundle(webSite, outputDir, sourceFiles) {
    // Prefer the sources if possible.
    sourceFiles = await Promise.all(sourceFiles.map(searchSourceOf));
    //region Creates the CSS bundle.
    // Jopi Loader hooks the CSS. It's why EsBuild can't automatically catch the CSS.
    // And why, here we bundle it manually.
    const outFilePath = path.join(outputDir, "loader.css");
    if (await nFS.isFile(outFilePath)) {
        await nFS.unlink(outFilePath);
    }
    // Assure the file exists.
    await fs.appendFile(outFilePath, "", "utf-8");
    let tailwindCss = await compileForTailwind(sourceFiles);
    if (tailwindCss)
        await fs.appendFile(outFilePath, tailwindCss, "utf-8");
    for (const cssFilePath of gAllCssFiles) {
        let css;
        if (cssFilePath.endsWith(".scss")) {
            css = scssToCss(cssFilePath);
        }
        else {
            css = await nFS.readTextFromFile(cssFilePath);
        }
        await fs.appendFile(outFilePath, css, "utf-8");
    }
    //endregion
    const loaderHash = {};
    webSite.data["jopiLoaderHash"] = loaderHash;
    // Calculate the hash.
    loaderHash.css = NodeSpace.crypto.md5(await nFS.readTextFromFile(path.join(outputDir, "loader.css")));
    // The file doesn't exist if we don't use hydrate components.
    //
    let jsFilePath = path.join(outputDir, "loader.js");
    if (!await nFS.isFile(path.join(outputDir, "loader.js")))
        await nFS.writeTextToFile(jsFilePath, "");
    loaderHash.js = NodeSpace.crypto.md5(await nFS.readTextFromFile(path.join(outputDir, "loader.js")));
}
const gAllCssFiles = [];
// @ts-ignore Is called by jopi-loader when found a CSS/SCSS file which isn't a module.
global.jopiOnCssImported = function (cssFilePath) {
    gAllCssFiles.push(cssFilePath);
};
export async function handleBundleRequest(req) {
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
        if (isJS)
            content = content.replaceAll("import.meta", "''");
        return new Response(content, { status: 200, headers: { "content-type": contentType } });
    }
    catch {
        return new Response("", { status: 404 });
    }
}
/**
 * Generate Tailwind CSS file a liste of source files, and returns the CSS or undefined.
 * @param sourceFiles
 *      The list of source files. It's .tsx files.
 * @returns
 *       The CSS or undefined.
 */
async function compileForTailwind(sourceFiles) {
    const tailwindConfig = {
        content: sourceFiles,
        theme: { extend: {} },
        plugins: [],
    };
    /*const inputCss = `
  @tailwind base;
  @tailwind components;
  @tailwind utilities;
`;*/
    const inputCss = `@import "tailwindcss";`;
    try {
        const processor = postcss([
            tailwindPostcss(tailwindConfig),
        ]);
        const result = await processor.process(inputCss, { from: undefined });
        return result.css;
    }
    catch (e) {
        console.error("Error while compiling for Tailwind:", e);
        return undefined;
    }
}
let gTempDirPath = path.join("node_modules", ".reactHydrateCache");
//endregion
//region UI
export function hasHydrateComponents() {
    return gHasComponents;
}
export function getHydrateComponents() {
    return gHydrateComponents;
}
function useHydrateComponent(importMeta) {
    if (NodeSpace.what.isServerSide) {
        const key = nCrypto.fastHash(importMeta.filename).toString();
        const filePath = importMeta.filename;
        const currentFilePath = gHydrateComponents[key];
        if (currentFilePath === filePath)
            return key;
        if (currentFilePath)
            throw new Error(`JopiHydrate: key ${key} already registered with ${currentFilePath}`);
        gHasComponents = true;
        gHydrateComponents[key] = filePath;
        return key;
    }
    return "";
}
function JopiHydrate({ id, args, asSpan, Child }) {
    const props = { "jopi-hydrate": JSON.stringify({ id, args }) };
    if (asSpan) {
        return _jsx("span", { ...props, children: _jsx(Child, { ...args }) });
    }
    return _jsx("div", { ...props, children: _jsx(Child, { ...args }) });
}
function onNewHydrate(importMeta, f, isSpan, cssModules) {
    // Register the component.
    const id = useHydrateComponent(importMeta);
    // Wrap our component.
    return (p) => {
        return _jsxs(_Fragment, { children: [useCssModule(cssModules), _jsx(JopiHydrate, { id: id, args: p, asSpan: isSpan, Child: f })] });
    };
}
const gHydrateComponents = {};
let gHasComponents = false;
setNewHydrateListener(onNewHydrate);
//# sourceMappingURL=hydrate.js.map