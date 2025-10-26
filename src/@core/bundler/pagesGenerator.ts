import * as jk_events from "jopi-toolkit/jk_events";
import * as jk_fs from "jopi-toolkit/jk_fs";
import * as jk_crypto from "jopi-toolkit/jk_crypto";
import type {LoaderScriptPluginsParams} from "./plugins.ts";
import {type BundlerConfig, getBundlerConfig} from "./config.ts";
import {getBrowserInstallScript} from "jopi-rewrite/linker";

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

        let outFilePath = jk_fs.join(genDir, fileName + ".jsx");
        await jk_fs.writeTextToFile(outFilePath, txt);

        // Will allows compiling it.
        config.entryPoints.push(outFilePath);
    }
});

const REACT_TEMPLATE = `
import React from "react";
import ReactDOM from "react-dom/client";
import {Page, ModuleInitContext_UI} from "jopi-rewrite/ui";
import C from "__PATH__";
import {UiKitModule} from "jopi-rewrite/uikit";
import installer from "__INSTALL__";
import "./tailwind.css";

installer(new UiKitModule());

const root = document.body;
const reactRoot = ReactDOM.createRoot(root);
reactRoot.render(<React.StrictMode><Page><C /></Page></React.StrictMode>);
`;

/**
 * Allow knowing the route from the page file path.
 */
const gPagePathToRoute: Record<string, string> = {};

/**
 * Allow knowing the name of the .js and .css file for a page.
 */
const gRouteToPageFile: Record<string, string> = {};