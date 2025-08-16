import * as NodeModule from 'node:module';
import * as ReactServer from 'react-dom/server';
import React from "react";

import "jopi-node-space";
import fs from "node:fs";
import {fileURLToPath} from "node:url";
import path from "node:path";

const extensionForResourceType_nojs = [
    ".css", ".scss",
    ".jpg", ".png", ".jpeg", ".gif", ".svg", ".webp",
    ".avif", ".ico",
    ".woff", ".woff2", ".ttf", ".txt",
];

export const extensionForResourceType = [
    ".js", ...extensionForResourceType_nojs
];

let gIsInitialized = false;

/**
 * Allow forcing calling this file before others.
 */
export function initLoader() {
    if (gIsInitialized) return;

    // To know: init is ko if this function is empty, du to optimisations.
    // It's also ko depending on node.js version.
    // Must is using --import jopi-rewrite option when starting node.js.
    //
    gIsInitialized = true;

    //debugger;
}

// It's only required for node.js, since bun.js already import CSS correctly.
//
if (NodeSpace.what.isNodeJS) {
    initLoader();

    // Warmup react.js to avoid a bug when using "registerHooks" with an older node.js version.
    ReactServer.renderToStaticMarkup(<div></div>);

    NodeModule.registerHooks({
        resolve(specifier, context, nextResolve) {
            function tryResolveFile(filePath: string, moduleName: string) {
                if (fs.existsSync(filePath)) {
                    return nextResolve(moduleName, context);
                }

                return undefined;
            }


            function tryResolveDirectory(url: string) {
                const basePath = fileURLToPath(url);
                let basename = path.basename(basePath);

                let allFilesToTry = ["index.js", basename + ".cjs.js", basename + ".js"];

                for (let fileToTry of allFilesToTry) {
                    const res = tryResolveFile(path.join(basePath, fileToTry), specifier + "/" + fileToTry);

                    if (res) {
                        return res;
                    }
                }

                // Will throw an error.
                return nextResolve(specifier, context);
            }

            function tryResolveModule(url: string) {
                const basePath = fileURLToPath(url);
                const res = tryResolveFile(basePath + ".js", specifier + ".js");

                if (res) {
                    return res;
                }

                // Will throw an error.
                return nextResolve(specifier, context);
            }

            if (extensionForResourceType_nojs.some(ext => specifier.endsWith(ext))) {
                //console.log("⚠️ jopi-loader-loader found: ", specifier);

                return {
                    url: new URL(specifier, context.parentURL).href,
                    format: 'jopi-loader',
                    shortCircuit: true
                };
            }

            try {
                return nextResolve(specifier, context);
            }
            catch(e: any) {
                if (e.code==="ERR_UNSUPPORTED_DIR_IMPORT") {
                    return tryResolveDirectory(e.url! as string);
                }

                if (e.code==="ERR_MODULE_NOT_FOUND") {
                    return tryResolveModule(e.url! as string);
                }

                throw e;
            }
        },

        load(url, context, nextLoad) {
            if (context.format === 'jopi-loader') {
                //console.log("⚠️ jopi-loader-loader transform to void: ", url);

                return {
                    source: 'export default {};',
                    format: 'module',
                    shortCircuit: true
                };
            }

            return nextLoad(url, context);
        }
    });
}