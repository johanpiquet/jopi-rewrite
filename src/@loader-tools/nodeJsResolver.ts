import * as ns_app from "jopi-toolkit/ns_app";
import * as ns_fs from "jopi-toolkit/ns_fs";
import {fileURLToPath} from "node:url";
import path from "node:path";
import {supportedExtensions} from "./rules.ts";
import {transformFile} from "./transform.ts";

//**********************************************************************************************************************
// NodeJS RESOLVER vs LOADER
//
// Resolver is the new Node.js API for import resolving and processing.
// But currently (Node v22) there is not a full support, and the old
// mechanism (loader) must be used for some special cases.
//
//**********************************************************************************************************************

export async function doNodeJsResolve(specifier: string, context: any, nextResolve: any) {
    async function tryResolveFile(filePath: string, moduleName: string) {
        if (await ns_fs.isFile(filePath)) {
            return nextResolve(moduleName, context);
        }

        return undefined;
    }

    async function tryResolveDirectory(url: string) {
        const basePath = fileURLToPath(url);
        let basename = path.basename(basePath);

        let allFilesToTry = ["index.js", basename + ".cjs.js", basename + ".js"];

        for (let fileToTry of allFilesToTry) {
            const res = await tryResolveFile(path.join(basePath, fileToTry), specifier + "/" + fileToTry);
            if (res) {
                return res;
            }
        }

        // Will throw an error.
        return nextResolve(specifier, context);
    }

    async function tryResolveModule(url: string) {
        const basePath = fileURLToPath(url);

        const res = await tryResolveFile(basePath + ".js", specifier + ".js");

        if (res) {
            return res;
        }

        // Will throw an error.
        return nextResolve(specifier, context);
    }

    // Remove what is after the "?" to be able to test the extension.
    //
    let idx = specifier.indexOf("?");
    let options = "";

    if (idx!==-1) {
        options = specifier.substring(idx);
        specifier = specifier.substring(0 ,idx);
    }

    if (supportedExtensions.includes(path.extname(specifier))) {
        const isRelative = specifier.startsWith("./") || specifier.startsWith("../");

        let href: string;

        if (!isRelative) {
            let resolved = await nextResolve(specifier, context);
            href = resolved.url;
        }
        else {
            href = new URL(specifier, context.parentURL).href;
        }

        return {
            url: href + options,
            format: "jopi-loader",
            shortCircuit: true
        };
    }

    try {
        return nextResolve(specifier, context);
    } catch (e: any) {
        if (e.code === "ERR_UNSUPPORTED_DIR_IMPORT") {
            return await tryResolveDirectory(e.url! as string);
        }
        if (e.code === "ERR_MODULE_NOT_FOUND") {
            return await tryResolveModule(e.url! as string);
        }
        throw e;
    }
}

// noinspection JSUnusedGlobalSymbols
export async function doNodeJsLoad(url: string, context: any, nextLoad: any) {
    if (context.format==="jopi-loader") {
        // Some ".js" file can be found here, du to a strange bug
        // inside the node.js loader, where the context object seems to be reused.
        // It doesn't go through doNodeJsResolve and directly appears here.
        //
        if (!supportedExtensions.includes(path.extname(url))) {
            context.format = "module";
            return nextLoad(url, context);
        }

        let idx = url.indexOf("?");
        let options = "";

        if (idx !== -1) {
            options = url.substring(idx + 1);
            url = url.substring(0, idx);
        }

        let filePath = fileURLToPath(url);

        // Occurs when it's compiled with TypeScript.
        if (!await ns_fs.isFile(filePath)) {
            filePath = ns_app.requireSourceOf(filePath);
        }

        try {
            let res = await transformFile(filePath, options);

            return {
                source: res.text,
                format: 'module',
                shortCircuit: true
            };
        }
        catch (e: any) {
            console.warn("jopi-loader - Error while loading:", e?.message || e);
            throw "jopi-loader - error";
        }
    }

    return nextLoad(url, context);
}