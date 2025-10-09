import {type WebSite, WebSiteImpl} from "../jopiWebSite.js";
import {serverInitChronos} from "../internalTools.js";
import NodeSpace, {nFS} from "jopi-node-space";
import {esBuildBundleExternal} from "./esbuild/bundler_esBuildExternal.js";
import path from "node:path";
import {esBuildBundle, jopiReplaceServerPlugin} from "./esbuild/bundler_esBuild.js";
import fs from "node:fs/promises";
import {scssToCss} from "@jopi-loader/tools";
import postcss from "postcss";
import tailwindPostcss from "@tailwindcss/postcss";
import {getHydrateComponents} from "../hydrate.ts";
import {generateScript} from "./scripts.ts";
import {getBundlerConfig} from "./config.ts";
import {calculateWebSiteTempDir} from "./common.ts";

export async function createBundle(webSite: WebSite): Promise<void> {
    serverInitChronos.start("createBrowserBundle", "Time for building browser bundler")

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

    serverInitChronos.end();
}

async function createBundle_esbuild_external(webSite: WebSite): Promise<void> {
    const components = getHydrateComponents();
    const outputDir = calculateWebSiteTempDir(webSite);

    const publicUrl = (webSite as WebSiteImpl).welcomeUrl + '/_bundle/';

    // Note: outputDir is deleted at startup by jopi-loader.

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

async function createBundle_esbuild(webSite: WebSite): Promise<void> {
    const components = getHydrateComponents();
    const outputDir = calculateWebSiteTempDir(webSite);

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

    await postProcessCreateBundle(webSite, outputDir, Object.values(components));
}

async function postProcessCreateBundle(webSite: WebSite, outputDir: string, sourceFiles: string[]) {
    // Prefer the sources if possible.
    sourceFiles = await Promise.all(sourceFiles.map(NodeSpace.app.requireSourceOf))

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

/**
 * Generate Tailwind CSS file a liste of source files, and returns the CSS or undefined.
 * @param sourceFiles
 *      The list of source files. It's .tsx files.
 * @returns
 *       The CSS or undefined.
 */
async function applyPostCss(sourceFiles: string[]): Promise<string|undefined> {
    if (!sourceFiles.length) return "";

    const bundlerConfig = getBundlerConfig();

    let plugins: postcss.AcceptedPlugin[] = [];

    let tailwindPlugin = bundlerConfig.tailwind.disable ?
        undefined : tailwindPostcss({
            content: sourceFiles,
            theme: {extend: {}},
            plugins: [],
            ...bundlerConfig.tailwind.config,
        } as any)

    if (bundlerConfig.postCss.initializer) {
        plugins = bundlerConfig.postCss.initializer(sourceFiles, tailwindPlugin);
    } else if (tailwindPlugin) {
        plugins = [tailwindPlugin];
    } else {
        return undefined;
    }

    if (!plugins.length) return undefined;

    let cssTemplate = bundlerConfig.tailwind.template || await getTailwindTemplateFromShadCnConfig() || `@import "tailwindcss";`;

    try {
        const processor = postcss(plugins);

        const result = await processor.process(cssTemplate, {
            // Setting 'from' allows resolving correctly the node_modules resolving.
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

/**
 * Get Tailwind template CSS file from Shadcn config file (components.json).
 * See: https://ui.shadcn.com/docs/components-json
 */
async function getTailwindTemplateFromShadCnConfig() {
    const pkgJsonPath = NodeSpace.app.findPackageJson();
    if (!pkgJsonPath) return undefined;

    let filePath = path.join(path.dirname(pkgJsonPath), "components.json");
    if (!await nFS.isFile(filePath)) return undefined;

    try {
        let asText = nFS.readTextSyncFromFile(filePath);
        let asJSON = JSON.parse(asText);

        let tailwindConfig = asJSON.tailwind;
        if (!tailwindConfig) return undefined;

        let tailwindCssTemplate = tailwindConfig.css;
        if (!tailwindCssTemplate) return undefined;

        let fullPath = path.resolve(path.dirname(pkgJsonPath), tailwindCssTemplate);
        return nFS.readTextSyncFromFile(fullPath);
    }
    catch (e) {
        console.error("Error reading Shadcn config file:", e);
        return undefined;
    }
}

export function addCssToBundle(cssFilePath: string) {
    gHasManuallyIncludedCss = true;
    if (gAllCssFiles.includes(cssFilePath)) return;
    gAllCssFiles.push(cssFilePath);
}

export function hasExternalCssBundled() {
    return gHasManuallyIncludedCss;
}

// @ts-ignore Is called by jopi-loader when found a CSS/SCSS file which isn't a module.
global.jopiOnCssImported = function(cssFilePath: string) {
    addCssToBundle(cssFilePath);
}

let gHasManuallyIncludedCss = false;
const gAllCssFiles: string[] = [];