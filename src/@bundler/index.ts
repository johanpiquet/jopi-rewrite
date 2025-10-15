import * as ns_fs from "jopi-node-space/ns_fs";
import *as ns_events from "jopi-node-space/ns_events";
import * as ns_crypto from "jopi-node-space/ns_crypto";
import type {CreateBundleEvent} from "jopi-rewrite";
import {launchEsBuildProcess} from "./launcher.ts";
import {applyTailwindProcessor} from "./tailwind.ts";
import path from "node:path";

async function createBundle(params: CreateBundleEvent): Promise<void> {
    const cssToAdd = [];
    const config = params.config;

    // Build file tailwind.css
    if (params.requireTailwind) {
        let cssFilePath = await applyTailwindProcessor(params);
        cssToAdd.push(cssFilePath);
    }

    // Load the metadata generated.
    const metaDataFilePath = ns_fs.join(params.genDir, "esbuildMeta.json");

    // Will launch EsBuild in a separate process
    // to avoid jopi-loader deforming the 'import'.
    //
    await launchEsBuildProcess({
        entryPoint: params.entryPoint,
        cssToAdd: cssToAdd,
        outputDir: params.outputDir,
        genDir: params.genDir,
        publicPath: params.publicUrl,
        metaDataFilePath,
        useWatchMode: params.enableUiWatch,
        dontEmbed: config.embed.dontEmbedThis
    });

    // Calc some hash that will allow bypassing the browser cache.
    await calcHash(params);

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

async function calcHash(params: CreateBundleEvent) {
    const loaderHash: any = {};
    params.webSite.data["jopiLoaderHash"] = loaderHash;

    let cssFilePath = path.join(params.outputDir, params.out_cssEntryPoint!);
    if (!await ns_fs.isFile(cssFilePath)) await ns_fs.writeTextToFile(cssFilePath, "");
    loaderHash.css = ns_crypto.md5(await ns_fs.readTextFromFile(cssFilePath));

    let jsFilePath = path.join(params.outputDir, params.out_jsEntryPoint!);
    if (!await ns_fs.isFile(jsFilePath)) await ns_fs.writeTextToFile(jsFilePath, "");
    loaderHash.js = ns_crypto.md5(await ns_fs.readTextFromFile(jsFilePath));
}

ns_events.addListener("jopi.server.bundle.createBundle", ns_events.EventPriority.VeryLow, (data) => {
    // Already handled?
    if (data.promise) return;

    data.promise = createBundle(data);
});

