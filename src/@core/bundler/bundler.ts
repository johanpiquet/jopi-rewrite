import {type WebSite, WebSiteImpl} from "../jopiWebSite.tsx";
import {serverInitChronos} from "../internalTools.ts";
import * as ns_fs from "jopi-node-space/ns_fs";
import * as ns_events from "jopi-node-space/ns_events";
import {getHydrateComponents} from "../hydrate.tsx";
import {generateScript} from "./scripts.ts";
import {getBundleDirPath} from "./common.ts";
import {type BundlerConfig, getBundlerConfig} from "./config.ts";
import {getExtraCssToBundle} from "./extraContent.ts";
import {configureServer} from "./server.ts";
import {getVirtualUrlMap, type VirtualUrlEntry} from "jopi-rewrite/loader-tools";

// Will initialize events listeners.
import "./eventHandlers.ts";

export interface CreateBundleEvent {
    entryPoint: string;
    outputDir: string;
    genDir: string;
    publicUrl: string;
    webSite: WebSite;
    reactComponentFiles: string[];
    config: BundlerConfig,
    requireTailwind: boolean;
    virtualUrlMap: VirtualUrlEntry[];

    enableUiWatch?: boolean;

    promise?: Promise<void>;

    out_dirToServe?: string;
    out_jsEntryPoint?: string;
    out_cssEntryPoint?: string;
}

export async function createBundle(webSite: WebSite): Promise<void> {
    serverInitChronos.start("createBrowserBundle", "Time for building browser bundler")

    const reactComponentFiles = getHydrateComponents();

    const genDir = getBundleDirPath(webSite);
    const outputDir = ns_fs.join(genDir, "out");

    // Reset the dir.
    await ns_fs.rmDir(genDir);
    await ns_fs.mkDir(genDir);

    const publicUrl = (webSite as WebSiteImpl).welcomeUrl + '/_bundle/';
    // noinspection PointlessBooleanExpressionJS
    const requireTailwind: boolean = (getBundlerConfig().tailwind.disable) !== true;

    const cssToImport = [...getExtraCssToBundle()];
    if (requireTailwind) cssToImport.push("./tailwind.css");

    const entryPoint = await generateScript(genDir, reactComponentFiles, cssToImport);

    const enableUiWatch = process.env.JOPI_DEV_UI === "1";

    const data: CreateBundleEvent = {
        entryPoint, outputDir, genDir, publicUrl, webSite,
        reactComponentFiles: Object.values(reactComponentFiles),
        config: getBundlerConfig(),
        requireTailwind,
        virtualUrlMap: getVirtualUrlMap(),

        enableUiWatch,

        //Default values
        out_dirToServe: outputDir,
        out_jsEntryPoint: "loader.js",
        out_cssEntryPoint: "loader.css"
    };

    // Set a default hash. Must be replaced by bundler.
    webSite.data["jopiLoaderHash"] = {css: "", js: ""};

    await execute(data);

    configureServer(data.out_dirToServe!, data.out_jsEntryPoint!, data.out_cssEntryPoint!);
    serverInitChronos.end();
}

async function execute(data: CreateBundleEvent, useFallback = true) {
    // Using an event allows replacing the bundler
    // through the use of event priority. The default
    // bundle has a very low priority.
    //
    ns_events.sendEvent("jopi.bundler.createBundle", data);

    if (data.promise) {
        // Mean it's handled.
        await data.promise;
    } else if (useFallback) {
        // Note: don't directly use a string here
        // otherwise it will trigger a bugged optimization
        // inside the TypeScript compiler.
        //
        await import(FALLBACK_PACKAGE);
        await execute(data, false);
    }
}

let FALLBACK_PACKAGE = "jopi-rewrite/bundler";
