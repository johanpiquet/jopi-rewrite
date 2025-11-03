import * as jk_events from "jopi-toolkit/jk_events";
import * as jk_fs from "jopi-toolkit/jk_fs";
import * as jk_crypto from "jopi-toolkit/jk_crypto";
import {type BundlerConfig} from "./config.ts";
import {getBrowserInstallScript} from "jopi-rewrite/linker";
import {getBrowserRefreshScript, isBrowserRefreshEnabled, isReactHMR} from "jopi-rewrite/loader-client";
import {getGlobalCssFileContent} from "jopi-rewrite/bundler";

// *********************************************************************************************************************
// The goal of this file is to generate the individual pages required for each page found in the root (index.page.tsx).
// *********************************************************************************************************************


// This event is called when a new page is found.
// Here we will fill a map "page file path" --> route.
//
jk_events.addListener("jopi.route.newPage", async ({route, filePath}: {route: string, filePath: string}) => {
    gPagePathToRoute[filePath] = route;
});

// This event is called when creating the bundled is creating.
//
// Here we will:
// - Generate the file named "page_xxxx.js" for each page, which will import the real page.
//      Doing this allows enforcing the name of the output produced.
// - Add this file to EsBuild entryPoints to build it with shared resources.
// - It will also generate a "page_xxxx.html" for Bun.js / React HMR.
//
jk_events.addListener("jopi.bundler.creatingBundle", async ({genDir, config}: {genDir: string, tailwindCss: string, config: BundlerConfig}) => {
    const installScript = getBrowserInstallScript();

    if (isReactHMR()) {
        let globalCss = await getGlobalCssFileContent(config);
        jk_fs.writeTextToFile(jk_fs.join(genDir, "tailwind-hmr.css"), globalCss);
    }

    for (let filePath in gPagePathToRoute) {
        let route = gPagePathToRoute[filePath];
        let fileName = "page_" + jk_crypto.fastHash(route);

        // Here we save the name without extension.
        gRouteToPageFile[route] = fileName;

        let txt = REACT_TEMPLATE;
        txt = txt.replace("__PATH__", filePath);
        txt = txt.replace("__INSTALL__", installScript);
        txt = txt.replace("__ROUTE__", JSON.stringify(route));

        if (isReactHMR()) {
            // Bun.js use his own SSE events.
            txt = txt.replace("__SSE_EVENTS__", "");
        }
        else if (isBrowserRefreshEnabled()) {
            // Node.js require our custom SSE events.
            txt = txt.replace("__SSE_EVENTS__", getBrowserRefreshScript());
        } else {
            // No SSE events if production.
            txt = txt.replace("__SSE_EVENTS__", "");
        }

        if (isReactHMR()) {
            // The uncompiled version of tailwind.
            txt = txt.replace("__EXTRA_IMPORTS__", 'import "./tailwind-hmr.css";');
        } else {
            txt = txt.replace("__EXTRA_IMPORTS__", 'import "./tailwind.css";');
        }

        let outFilePath = jk_fs.join(genDir, fileName + ".jsx");
        config.entryPoints.push(outFilePath);
        await jk_fs.writeTextToFile(outFilePath, txt);

        txt = HTML_TEMPLATE;
        txt = txt.replace("__SCRIPT_PATH__", "./" + fileName + ".jsx");
        outFilePath = jk_fs.join(genDir, fileName + ".html");
        await jk_fs.writeTextToFile(outFilePath, txt);
    }
});

const HTML_TEMPLATE = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Dev Mode</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="__SCRIPT_PATH__"></script>
  </body>
</html>`;

const REACT_TEMPLATE = `import React from "react";
import ReactDOM from "react-dom/client";
import {PageContext, PageController_ExposePrivate} from "jopi-rewrite/ui";
import C from "__PATH__";
import {UiKitModule} from "jopi-rewrite/uikit";
import installer from "__INSTALL__";
__EXTRA_IMPORTS__

installer(new UiKitModule());

window["__JOPI_ROUTE__"] = __ROUTE__;

function start() {
    const container = document.body;
    const root = ReactDOM.createRoot(container);
    root.render(<React.StrictMode><PageContext.Provider value={new PageController_ExposePrivate()}>
                        <C/></PageContext.Provider></React.StrictMode>);
}

__SSE_EVENTS__

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
} else {
  start();
}
`;

/**
 * Allow knowing the route from the page file path.
 */
const gPagePathToRoute: Record<string, string> = {};

/**
 * Allow knowing the name of the .js and .css file for a page.
 */
const gRouteToPageFile: Record<string, string> = {};