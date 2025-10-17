import * as ns_fs from "jopi-node-space/ns_fs";
import *as ns_events from "jopi-node-space/ns_events";
import type {CreateBundleEvent} from "jopi-rewrite";
import {launchEsBuildProcess} from "./launcher.ts";

async function createBundle(params: CreateBundleEvent): Promise<void> {
    const config = params.config;

    let replaceRules: Record<string, string> = {
        "jopi-node-space-server": "jopi-node-space-browser",
        "jBundler_ifServer": "jBundler_ifBrowser"
    };

    if (config.reactRouter.disable!==true) {
        replaceRules["jBundler_isServer_noBrowser_noReactRouter"] = "jBundler_noServer_isBrowser_isReactRouter";
    } else {
        replaceRules["jBundler_isServer_noBrowser_noReactRouter"] = "jBundler_noServer_isBrowser_noReactRouter";
    }

    // Load the metadata generated.
    const metaDataFilePath = ns_fs.join(params.genDir, "esbuildMeta.json");

    // Will launch EsBuild in a separate process
    // to avoid jopi-loader deforming the 'import'.
    //
    await launchEsBuildProcess({
        metaDataFilePath,
        dontEmbed: config.embed.dontEmbedThis,
        replaceRules,

        ...params
    });

    // Virtual url are temporaire url used by Server Side.
    // If they are required, it's because at compile-time
    // we aren't able to know what is the final bundled url.
    //
    await resolveVirtualUrls(params, metaDataFilePath);
}

async function resolveVirtualUrls(params: CreateBundleEvent, metaDataFilePath: string) {
    if (!await ns_fs.isFile(metaDataFilePath)) return;

    let meta = JSON.parse(await ns_fs.readTextFromFile(metaDataFilePath));
    let virtualUrls = params.virtualUrlMap;

    for (let virtualUrl of virtualUrls) {
        let bundledFile = meta[virtualUrl.sourceFile];
        if (bundledFile) virtualUrl.bundleFile = ns_fs.resolve(bundledFile);
    }
}

// createBundle is called when the event is triggered.
//
ns_events.addListener("jopi.bundler.createBundle", ns_events.EventPriority.VeryLow, (data) => {
    // Already handled?
    if (data.promise) return;

    data.promise = createBundle(data);
});