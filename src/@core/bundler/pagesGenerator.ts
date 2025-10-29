import * as jk_events from "jopi-toolkit/jk_events";
import * as jk_fs from "jopi-toolkit/jk_fs";
import * as jk_crypto from "jopi-toolkit/jk_crypto";
import {type BundlerConfig} from "./config.ts";
import {getBrowserInstallScript} from "jopi-rewrite/linker";
import {getBrowserRefreshScript, isBrowserRefreshEnabled} from "jopi-rewrite/loader-client";
import {isBunJS} from "jopi-toolkit/jk_what";

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

    for (let filePath in gPagePathToRoute) {
        let route = gPagePathToRoute[filePath];
        let fileName = "page_" + jk_crypto.fastHash(route);

        // Here we save the name without extension.
        gRouteToPageFile[route] = fileName;

        let txt = REACT_TEMPLATE;
        txt = txt.replace("__PATH__", filePath);
        txt = txt.replace("__INSTALL__", installScript);

        if (isBrowserRefreshEnabled() && !isBunJS) {
            txt = txt.replace("__SSE_EVENTS__", getBrowserRefreshScript());
        } else {
            txt = txt.replace("__SSE_EVENTS__", "");
        }

        let outFilePath = jk_fs.join(genDir, fileName + ".jsx");
        await jk_fs.writeTextToFile(outFilePath, txt);
        config.entryPoints.push(outFilePath);

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
import "./tailwind.css";

installer(new UiKitModule());

function start() {
    const container = document.getElementById("root");
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