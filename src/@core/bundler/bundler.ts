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

export interface CreateBundleEvent {
    entryPoints: string[];
    outputDir: string;
    genDir: string;
    publicUrl: string;
    webSite: WebSite;
    config: BundlerConfig,
    requireTailwind: boolean;
    virtualUrlMap: VirtualUrlEntry[];

    enableUiWatch?: boolean;

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

    const enableUiWatch = process.env.JOPI_DEV_UI === "1";
    const config = getBundlerConfig();

    await jk_events.sendAsyncEvent("jopi.bundler.creatingBundle", {
        webSite, genDir, config, publicUrl, innerUrl, enableUiWatch,
        tailwindCss: requireTailwind ? innerUrl + "tailwind.css" : undefined
    });

    const data: CreateBundleEvent = {
        outputDir, genDir, publicUrl, webSite, requireTailwind, enableUiWatch,
        config: getBundlerConfig(), entryPoints: [...config.entryPoints],
        virtualUrlMap: getVirtualUrlMap()
    };

    await executeBundler(data);

    configureServer(outputDir);
    serverInitChronos.end();
}

async function executeBundler(data: CreateBundleEvent, useFallback = true) {
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