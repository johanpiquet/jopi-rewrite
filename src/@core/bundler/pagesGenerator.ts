import * as jk_events from "jopi-toolkit/jk_events";
import * as jk_fs from "jopi-toolkit/jk_fs";
import * as jk_crypto from "jopi-toolkit/jk_crypto";
import type {LoaderScriptPluginsParams} from "./plugins.ts";
import {getBundlerConfig} from "./config.ts";
import {getBrowserInstallScript} from "jopi-rewrite/linker";

// *********************************************************************************************************************
// The goal of this file is to generate the individual pages required for each page found in the root (index.page.tsx).
// *********************************************************************************************************************

// This event is emitted when EsBuild import a CSS.
// It allows knowing who is using what CSS, but it needs
// to bundle the whole project to know this information.
//
// Here we will fill a map "CSS importer" <-> CSS file.
//
//jk_events.addListener("jopi.bundler.resolve.css", async (data: {resolveDir: string, path: string, importer: string}) => {
    //let cssFilePath = jk_fs.join(data.resolveDir, data.path);
    //let route = gPagePathToRoute[data.importer];
    //if (route) console.log(`🔥  Route [${route}] is using CSS`, data.path);
//});

// This event is called when a new page is found.
// Here we will fill a map "page file path" --> route.
//
jk_events.addListener("jopi.route.newPage", async ({route, filePath}: {route: string, filePath: string}) => {
    gPagePathToRoute[filePath] = route;
    //console.log("🔥 jopi.route.newPage", route, "-->", filePath);
});

// This event is called when creating the script "loader.jsx"
// which is the main entry point for the bundler.
//
// Here we will:
// - Generate the file named "page_xxxx.js" for each page, which will import the real page.
//      Doing this allows enforcing the name of the output produced.
// - Add this file to EsBuild entryPoints to build it with shared resources.
//
jk_events.addListener("jopi.bundler.creatingScript", async (data: LoaderScriptPluginsParams) => {
    let outDir = data.outDir;
    let config = getBundlerConfig();

    for (let filePath in gPagePathToRoute) {
        let route = gPagePathToRoute[filePath];
        let fileName = "page_" + jk_crypto.fastHash(route);

        // Here we save the name without extension.
        gRouteToPageFile[route] = fileName;

        let outFilePath = jk_fs.join(outDir, fileName + ".jsx");
        let installScript = getBrowserInstallScript();

        let txt = REACT_TEMPLATE;
        txt = txt.replace("__PATH__", filePath);
        txt = txt.replace("__DEPS__", `import "${installScript}"`);

        await jk_fs.writeTextToFile(outFilePath, txt);

        config.entryPoints.push(outFilePath);
    }
});

const REACT_TEMPLATE = `
import React from "react";
import ReactDOM from "react-dom/client";
__DEPS__; 
import C from "__PATH__";
const root = document.body;
const reactRoot = ReactDOM.createRoot(root);
reactRoot.render(<React.StrictMode><C /></React.StrictMode>);
`;

/**
 * Allow knowing the route from the page file path.
 */
const gPagePathToRoute: Record<string, string> = {};

/**
 * Allow knowing the name of the .js and .css file for a page.
 */
const gRouteToPageFile: Record<string, string> = {};