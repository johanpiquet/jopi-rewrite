import * as jk_fs from "jopi-toolkit/jk_fs";
import * as jk_events from "jopi-toolkit/jk_events";
import type {CreateBundleParams} from "jopi-rewrite";
import {isDevMode} from "../@loader-client";
import {esBuildBundle, type EsBuildParams} from "./esbuild";

async function createBundle(params: CreateBundleParams): Promise<void> {
    const config = params.config;

    // Load the metadata generated.
    const metaDataFilePath = jk_fs.join(params.genDir, "esbuildMeta.json");

    // Will launch EsBuild in a separate process
    // to avoid jopi-loader deforming the 'import'.
    //
    await launchEsBuildProcess({
        metaDataFilePath,
        dontEmbed: config.embed.dontEmbedThis,

        ...params
    });

    // Virtual url are temporary url used by Server Side.
    // If they are required, it's because at compile-time
    // we aren't able to know what is the final bundled url.
    //
    await resolveVirtualUrls(params, metaDataFilePath);
}

async function resolveVirtualUrls(params: CreateBundleParams, metaDataFilePath: string) {
    if (!await jk_fs.isFile(metaDataFilePath)) return;

    let meta = JSON.parse(await jk_fs.readTextFromFile(metaDataFilePath));
    let virtualUrls = params.virtualUrlMap;

    for (let virtualUrl of virtualUrls) {
        let bundledFile = meta[virtualUrl.sourceFile];
        if (bundledFile) virtualUrl.bundleFile = jk_fs.resolve(bundledFile);
    }
}

export async function launchEsBuildProcess(params: EsBuildParams) {
    process.env.JOPI_BUNLDER_ESBUILD = "1";

    try {
        await esBuildBundle(params);
    }
    finally {
        delete process.env.JOPI_BUNLDER_ESBUILD;
    }
}

// createBundle is called when the event is triggered.
//
jk_events.addListener("jopi.bundler.createBundle", jk_events.EventPriority.veryLow, (data) => {
    // If devMode (JOPI_DEV or JOPI_DEV_UI) then we
    // compile the pages one by one when the page is requested,
    // and not every page at the same time.
    //
    if (isDevMode()) return;

    // Already handled?
    if (data.promise) return;

    data.promise = createBundle(data);
});

jk_events.addListener("jopi.bundler.createBundleForPage", jk_events.EventPriority.veryLow, async (data) => {
    await createBundle(data);
});