import * as jk_events from "jopi-toolkit/jk_events";
import * as jk_fs from "jopi-toolkit/jk_fs";
import * as jk_crypto from "jopi-toolkit/jk_crypto";
import {type BundlerConfig} from "./config.ts";
import {getBrowserInstallScript} from "jopi-rewrite/linker";
import {getBrowserRefreshScript, isBrowserRefreshEnabled, isDevMode, isReactHMR} from "jopi-rewrite/loader-client";
import {getGlobalCssFileContent} from "jopi-rewrite/bundler";
import type {WebSiteImpl} from "../jopiWebSite.tsx";

// *********************************************************************************************************************
// The goal of this file is to generate the individual pages required for each page found in the root (page.tsx).
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
jk_events.addListener("jopi.bundler.beforeCreateBundle", rebuildPages);

async function rebuildPages({genDir, config, webSite}: {
    webSite: WebSiteImpl, genDir: string,
    tailwindCss: string, config: BundlerConfig
}) {
    const installScript = getBrowserInstallScript();

    if (isReactHMR()) {
        let globalCss = await getGlobalCssFileContent(config);
        await jk_fs.writeTextToFile(jk_fs.join(genDir, "tailwind-hmr.css"), globalCss);
    }

    for (let sourceFilePath in gPagePathToRoute) {
        let route = gPagePathToRoute[sourceFilePath];
        let pageKey = "page_" + jk_crypto.fastHash(route);

        // Here we save the name without extension.
        gRouteToPageFile[route] = pageKey;

        let txt = REACT_TEMPLATE;
        txt = txt.replace("__PATH__", sourceFilePath);
        txt = txt.replace("__INSTALL__", installScript);
        txt = txt.replace("__ROUTE__", JSON.stringify(route));
        txt = txt.replace("__OPTIONS__", JSON.stringify({removeTrailingSlashs: webSite.mustRemoveTrailingSlashs}));

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
            if (isDevMode()) {
                txt = txt.replace("__EXTRA_IMPORTS__", `import "./${pageKey}/tailwind.css";`);
            } else {
                txt = txt.replace("__EXTRA_IMPORTS__", 'import "./tailwind.css";');
            }
        }

        let outFilePath = jk_fs.join(genDir, pageKey + ".jsx");
        config.entryPoints.push(outFilePath);
        await jk_fs.writeTextToFile(outFilePath, txt);

        txt = HTML_TEMPLATE;

        if (gIsDevMode) {
            txt = txt.replace("__SCRIPT_PATH__", "./" + pageKey + '/' + pageKey + ".jsx");
        } else {
            txt = txt.replace("__SCRIPT_PATH__", "./" + pageKey + ".jsx");
        }
        outFilePath = jk_fs.join(genDir, pageKey + ".html");
        await jk_fs.writeTextToFile(outFilePath, txt);
    }
}

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
import {UiKitModule, useParams} from "jopi-rewrite/uikit";

import installer from "__INSTALL__";
__EXTRA_IMPORTS__

window["__JOPI_ROUTE__"] = __ROUTE__;
window["__JOPI_OPTIONS__"] = __OPTIONS__;

installer(new UiKitModule());

function Render(p) {
    const [_, setCount] = React.useState(0);
    p.controller.onRequireRefresh = () => setCount(old => old + 1);
    return <C params={p.params} searchParams={p.searchParams} />;
}

function start() {
    const container = document.body;
    const root = ReactDOM.createRoot(container);
    const params = useParams();
    const searchParams = new URL(window.location).searchParams;
    const controller = new PageController_ExposePrivate();
    
    root.render(
        <React.StrictMode>
            <PageContext.Provider value={controller}>
                <Render controller={controller} params={params} searchParams={searchParams} />
            </PageContext.Provider>
        </React.StrictMode>
    );
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

const gIsDevMode = isDevMode();