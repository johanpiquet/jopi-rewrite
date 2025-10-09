import {type WebSite, WebSiteImpl} from "../jopiWebSite.js";
import {serverInitChronos} from "../internalTools.js";
import {nEvents} from "jopi-node-space";
import {getHydrateComponents} from "../hydrate.ts";
import {generateScript} from "./scripts.ts";
import {getBundleDirPath} from "./common.ts";
import {type BundlerConfig, getBundlerConfig} from "./config.js";
import {getExtraCssToBundle} from "./extraContent.js";
import {configureServer} from "./server.js";

export interface CreateBundleEvent {
    entryPoint: string;
    outputDir: string;
    publicUrl: string;
    webSite: WebSite;
    reactComponentFiles: string[];
    config: BundlerConfig,
    extraCssToBundle: string[];

    promise?: Promise<void>;

    out_dirToServe?: string;
    out_entryPoint?: string;
}

export async function createBundle(webSite: WebSite): Promise<void> {
    serverInitChronos.start("createBrowserBundle", "Time for building browser bundler")

    const reactComponentFiles = getHydrateComponents();

    // Note: outputDir is deleted at startup by jopi-loader.
    const outputDir = getBundleDirPath(webSite);

    const publicUrl = (webSite as WebSiteImpl).welcomeUrl + '/_bundle/';
    const entryPoint = await generateScript(outputDir, reactComponentFiles);

    const data: CreateBundleEvent = {
        entryPoint, outputDir, publicUrl, webSite,
        reactComponentFiles: Object.values(reactComponentFiles),
        config: getBundlerConfig(),
        extraCssToBundle: getExtraCssToBundle(),

        //Default value
        out_dirToServe: outputDir,
        out_entryPoint: "loader.js"
    };

    // Set a default hash. Must be replaced by bundler.
    webSite.data["jopiLoaderHash"] = {css: "", js: ""};

    await execute(data);

    configureServer(data.out_dirToServe!, data.out_entryPoint!);
    serverInitChronos.end();
}

async function execute(data: CreateBundleEvent, useFallback = true) {
    // Using an event allows replacing the bundler
    // through the use of event priority. The default
    // bundle has a very low priority.
    //
    nEvents.sendEvent("jopi.server.bundle.createBundle", data);

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

let FALLBACK_PACKAGE = "@jopi-rewrite/bundler-esbuild";
