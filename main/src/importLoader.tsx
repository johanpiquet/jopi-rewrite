import { registerHooks } from 'node:module';
import * as ReactServer from 'react-dom/server';
import React from "react";

// Warmup react.js to avoid a bug when using "registerHooks" with older node.js version.
ReactServer.renderToStaticMarkup(<div></div>);

const ignoredExtensions = ['.css', '.scss'];

registerHooks({
    resolve(specifier, context, nextResolve) {
        if (ignoredExtensions.some(ext => specifier.endsWith(ext))) {
            console.log("⚠️ jopi-loader-loader found: ", specifier);

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
            console.log("⚠️ jopi-loader-loader transform to void: ", url);

            return {
                source: 'export default {};',
                format: 'module',
                shortCircuit: true
            };
        }

        return nextLoad(url, context);
    }
});
