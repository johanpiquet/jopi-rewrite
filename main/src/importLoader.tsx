import { registerHooks } from 'node:module';
import * as ReactServer from 'react-dom/server';
import React from "react";

import "jopi-node-space";

// It's only required for node.js, since bun.js already import CSS correctly.
//
if (NodeSpace.what.isNodeJS) {
    // Warmup react.js to avoid a bug when using "registerHooks" with an older node.js version.
    ReactServer.renderToStaticMarkup(<div></div>);

    registerHooks({
        resolve(specifier, context, nextResolve) {
            if (extensionForResourceType_nojs.some(ext => specifier.endsWith(ext))) {
                //console.log("⚠️ jopi-loader-loader found: ", specifier);

                return {
                    url: new URL(specifier, context.parentURL).href,
                    format: 'jopi-loader',
                    shortCircuit: true
                };
            }

            return nextResolve(specifier, context);
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

const extensionForResourceType_nojs = [
    ".css", ".scss",
    ".jpg", ".png", ".jpeg", ".gif", ".svg", ".webp",
    ".avif", ".ico",
    ".woff", ".woff2", ".ttf", ".txt",
];

export const extensionForResourceType = [
    ".js", ...extensionForResourceType_nojs
];