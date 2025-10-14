import path from "node:path";
import NodeSpace, {nApp} from "jopi-node-space";
import {isServerSide} from "jopi-node-space/ns_what";

import React from "react";
import {setHandler_bundleExternalCss, setHandler_mustHydrate, useCssModule} from "jopi-rewrite-ui";
import {fileURLToPath, pathToFileURL} from "node:url";
import {addExtraCssToBundle} from "./bundler/extraContent.ts";
import * as ns_crypto from "jopi-node-space/ns_crypto";
import * as ns_fs from "jopi-node-space/ns_fs";

export function hasHydrateComponents() {
    return gHasComponents;
}

export function getHydrateComponents() {
    return gHydrateComponents;
}

interface JopiHydrateProps {
    Child: React.FunctionComponent;
    args: any;
    id: string;
    asSpan: boolean;
}

function useHydrateComponent(importMeta: { filename: string }): string {
    if (isServerSide) {
        const key = ns_crypto.fastHash(importMeta.filename).toString();
        const filePath = importMeta.filename;

        const currentFilePath = gHydrateComponents[key];
        if (currentFilePath === filePath) return key;
        if (currentFilePath) throw new Error(`JopiHydrate: key ${key} already registered with ${currentFilePath}`);

        gHasComponents = true;
        gHydrateComponents[key] = filePath;

        return key;
    }

    return "";
}

function JopiHydrate({id, args, asSpan, Child}: JopiHydrateProps) {
    const props = {"jopi-hydrate": JSON.stringify({id, args})};

    if (asSpan) {
        return <span {...props}><Child {...args}>{}</Child></span>;
    }

    return <div {...props}><Child {...args}>{}</Child></div>;
}

export function getBrowserComponentKey(fullFilePath: string): string {
    for (let key in gHydrateComponents) {
        if (gHydrateComponents[key]===fullFilePath) {
            return key;
        }
    }

    throw new Error("Can't found component key for " + fullFilePath);
}

function onNewHydrate(importMeta: {filename: string}, f: React.FunctionComponent, isSpan: boolean, cssModules?: Record<string, string>): React.FunctionComponent {
    // Prevent double call to mustHydrate.
    // Can occur with the page mechanism if 'mustHydrate' is called inside the page.
    //
    let existing = gPathToHydrateComponent[importMeta.filename];
    if (existing) return existing;

    // Register the component.
    const id = useHydrateComponent(importMeta);

    // Wrap our component.
    let cpn = (p: any) => {
        useCssModule(cssModules);
        return <JopiHydrate id={id} args={p} asSpan={isSpan} Child={f as React.FunctionComponent}/>;
    }

    gPathToHydrateComponent[importMeta.filename] = cpn;

    return cpn;
}

async function handler_bundleExternalCss(importMeta: {filename: string}, cssFilePath: string) {
    // Resolve the file path, which must be a file url, absolute or relative.

    let cssFileUrl: string;

    if (cssFilePath.startsWith("file:/")) {
        cssFileUrl = cssFilePath;
    } else {
        if (!cssFilePath.startsWith("./")) {
            console.error("* CSS file must starts with 'file:/' or './'\n|- See:", await NodeSpace.app.requireSourceOf(importMeta.filename));
        }

        let dirPath = path.dirname(importMeta.filename);
        cssFileUrl = pathToFileURL(dirPath).href + '/' + cssFilePath;
    }

    cssFilePath = fileURLToPath(cssFileUrl);

    // If using a TypeScript compiler, then the CSS remain in the source folder.
    cssFilePath = nApp.requireSourceOf(cssFilePath);

    if (!await ns_fs.isFile(cssFilePath)) {
        console.warn("JopiHydrate: CSS file not found:", cssFilePath);
        return;
    }

    addExtraCssToBundle(cssFilePath);
}

const gHydrateComponents: {[key: string]: string} = {};
const gPathToHydrateComponent: {[path: string]: React.FunctionComponent} = {};

let gHasComponents = false;

setHandler_mustHydrate(onNewHydrate);
setHandler_bundleExternalCss(handler_bundleExternalCss);