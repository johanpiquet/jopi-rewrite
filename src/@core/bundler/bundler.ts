import {type WebSite, WebSiteImpl} from "../jopiWebSite.tsx";
import {serverInitChronos} from "../internalTools.ts";
import * as jk_fs from "jopi-toolkit/jk_fs";
import * as jk_events from "jopi-toolkit/jk_events";
import {getBundleDirPath} from "./common.ts";
import {type BundlerConfig, getBundlerConfig} from "./config.ts";
import {getExtraCssToBundle} from "./extraContent.ts";
import {configureServer} from "./server.ts";
import {getVirtualUrlMap, type VirtualUrlEntry} from "jopi-rewrite/loader-tools";
import "./pagesGenerator.ts";
import {isBunJS} from "jopi-toolkit/jk_what";
import {isDevMode, isReactHMR} from "jopi-rewrite/loader-client";

export interface CreateBundleParams {
    // Is enabled when JOPI_DEV or JOPI_DEV_UI
    singlePageMode: boolean;

    entryPoints: string[];
    outputDir: string;
    genDir: string;
    publicUrl: string;
    webSite: WebSite;
    config: BundlerConfig,
    requireTailwind: boolean;
    virtualUrlMap: VirtualUrlEntry[];

    enableUiWatch?: boolean;
    pageKey?: string;
    pageScript?: string;

    promise?: Promise<void>;
}

export async function createBundle(webSite: WebSite): Promise<void> {
    serverInitChronos.start("createBrowserBundle", "Time for building browser bundler")

    const genDir = getBundleDirPath(webSite);
    const outputDir = jk_fs.join(genDir, "out");

    // Reset the dir.
    await jk_fs.rmDir(genDir);
    await jk_fs.mkDir(genDir);

    const innerUrl =  "/_bundle/";
    const publicUrl = (webSite as WebSiteImpl).welcomeUrl + innerUrl;

    // noinspection PointlessBooleanExpressionJS
    const requireTailwind: boolean = (getBundlerConfig().tailwind.disable) !== true;

    const cssToImport = [...getExtraCssToBundle()];

    if (requireTailwind) cssToImport.push("./tailwind.css");

    // Bun has his own bundler system of development.
    const enableUiWatch = (process.env.JOPI_DEV_UI === "1") && !isBunJS;
    const config = getBundlerConfig();

    await jk_events.sendAsyncEvent("jopi.bundler.beforeCreateBundle", {
        webSite, genDir, config, publicUrl, innerUrl, enableUiWatch,
        tailwindCss: requireTailwind ? innerUrl + "tailwind.css" : undefined
    });

    // React HMR mode uses on the fly bundler.
    // It's why we don't generate the default bundle here.
    //
    if (!isReactHMR()) {
        await executeBundler(gCreateBundleData = {
            singlePageMode: isDevMode(),
            outputDir, genDir, publicUrl, webSite, requireTailwind, enableUiWatch,
            config: getBundlerConfig(), entryPoints: [...config.entryPoints],
            virtualUrlMap: getVirtualUrlMap()
        });
    }

    configureServer(outputDir);
    serverInitChronos.end();
}

let gCreateBundleData: CreateBundleParams|undefined;

let gPageBundlerIsOk: Record<string, boolean> = {};

export async function createBundleForPage(pageKey: string) {
    // Allow knowing of this page is already compiled.
    if (gPageBundlerIsOk[pageKey]) return;
    gPageBundlerIsOk[pageKey] = true;

    let fileName = pageKey + ".jsx";

    if (!gCreateBundleData) return;

    let params = {...gCreateBundleData};
    params.pageKey = pageKey;
    params.pageScript = jk_fs.join(params.genDir, fileName);

    await jk_events.sendAsyncEvent("jopi.bundler.createBundleForPage", params);
}

async function executeBundler(data: CreateBundleParams, useFallback = true) {
    // Using an event allows replacing the bundler
    // through the use of event priority. The default
    // bundle has a very low priority.
    //
    jk_events.sendEvent("jopi.bundler.createBundle", data);

    if (data.promise) {
        // Mean it's handled.
        await data.promise;
    } else if (useFallback) {
        // Note: don't directly use a string here
        // otherwise it will trigger a bugged optimization
        // inside the TypeScript compiler.
        //
        await import(FALLBACK_PACKAGE);
        await executeBundler(data, false);
    }
}

let FALLBACK_PACKAGE = "jopi-rewrite/bundler";