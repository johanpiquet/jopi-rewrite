import * as jk_fs from "jopi-toolkit/jk_fs";
import *as jk_events from "jopi-toolkit/jk_events";
import type {CreateBundleEvent} from "jopi-rewrite";
import {launchEsBuildProcess} from "./launcher.ts";

async function createBundle(params: CreateBundleEvent): Promise<void> {
    const config = params.config;

    let replaceRules: Record<string, string> = {
        "jBundler_ifServer": "jBundler_ifBrowser"
    };

    // Load the metadata generated.
    const metaDataFilePath = jk_fs.join(params.genDir, "esbuildMeta.json");

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
    if (!await jk_fs.isFile(metaDataFilePath)) return;

    let meta = JSON.parse(await jk_fs.readTextFromFile(metaDataFilePath));
    let virtualUrls = params.virtualUrlMap;

    for (let virtualUrl of virtualUrls) {
        let bundledFile = meta[virtualUrl.sourceFile];
        if (bundledFile) virtualUrl.bundleFile = jk_fs.resolve(bundledFile);
    }
}

// createBundle is called when the event is triggered.
//
jk_events.addListener("jopi.bundler.createBundle", jk_events.EventPriority.VeryLow, (data) => {
    // Already handled?
    if (data.promise) return;

    data.promise = createBundle(data);
});