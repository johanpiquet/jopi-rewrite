import path from "node:path";
import esbuild, {type Plugin} from "esbuild";
import sassPlugin from 'esbuild-plugin-sass';
import React from "react";

import {type JopiRequest, WebSite} from "./core.ts";

const nFS = NodeSpace.fs;
const nCrypto = NodeSpace.crypto;

// @ts-ignore
//import template from "./template.jsx?raw";
import {setNewHydrateListener} from "jopi-rewrite-ui";
import fs from "node:fs/promises";

//region Bundle

async function generateScript(outputDir: string, components: {[key: string]: string}): Promise<string> {
    let declarations = "";

    for (const componentKey in components) {
        const componentPath = components[componentKey];
        declarations += `\njopiHydrate.components["${componentKey}"] = lazy(() => import("${componentPath}"));`;
    }

    let resolvedPath: string;

    if (NodeSpace.what.isNodeJS) {
        resolvedPath = import.meta.resolve("./../src/template.jsx");
    } else {
        resolvedPath = import.meta.resolve("./../src/template.jsx");
    }

    resolvedPath = NodeSpace.fs.fileURLToPath(resolvedPath);
    let template = await NodeSpace.fs.readTextFromFile(resolvedPath);
    let script = template.replace("//[DECLARE]", declarations);

    const filePath = path.join(outputDir, "loader.jsx");
    await NodeSpace.fs.writeTextToFile(filePath, script, true);

    return filePath;
}

async function doBundling_EsBuild(entryPoint: string, outputDir: string, publicPath: string): Promise<void> {
    const jopiReplaceServerPlugin: Plugin = {
        name: "jopi-replace-server",

        setup(build) {
            build.onLoad({ filter: /\.(ts|js)x?$/ }, async (args) => {
                let contents = await fs.readFile(args.path, 'utf8');
                const newContents = contents.replace("jopi-node-space-server", "jopi-node-space-browser");

                if (newContents === contents) return null;
                return {contents: newContents, loader: 'ts'};
            });
        }
    };

    await esbuild.build({
        entryPoints: [entryPoint],
        bundle: true,
        outdir: outputDir,
        platform: 'browser',
        format: 'esm',
        target: "es2020",
        publicPath: publicPath,
        splitting: true,

        plugins: [sassPlugin(), jopiReplaceServerPlugin],

        loader: {
            // Polices
            '.woff': 'file',
            '.woff2': 'file',
            '.ttf': 'file',
            '.eot': 'file',
            // Images
            '.jpg': 'file',
            '.jpeg': 'file',
            '.png': 'file',
            '.svg': 'file',
            '.gif': 'file',
            '.webp': 'file',
            // Médias
            '.mp3': 'file',
            '.mp4': 'file',
            // Autres
            '.html': 'text',
            '.md': 'text'
        },

        minify: true,
        sourcemap: true
    });
}

export function getBundleUrl(webSite: WebSite) {
    return webSite.welcomeUrl + "/_bundle";
}

export async function createBundle(webSite: WebSite): Promise<void> {
    if (!hasHydrateComponents()) return;

    const components = getHydrateComponents();
    const outputDir = path.join(gTempDirPath, webSite.hostName);
    const entryPoint = await generateScript(outputDir, components);
    const publicUrl = webSite.welcomeUrl + '/_bundle/';

    await doBundling_EsBuild(entryPoint, outputDir, publicUrl);
}

export async function handleBundleRequest(req: JopiRequest): Promise<Response> {
    const pathName = req.urlInfos.pathname;
    let idx = pathName.lastIndexOf("/");
    const fileName = pathName.substring(idx);
    const filePath = path.resolve(path.join(gTempDirPath, req.webSite.hostName, fileName));

    let contentType = nFS.getMimeTypeFromName(filePath);
    let isJS = false;

    if (contentType.startsWith("text/javascript")) {
        isJS = true;
        contentType = "application/javascript;charset=utf-8";
    }

    try {
        let content = await nFS.readTextFromFile(filePath);

        if (isJS) {
            content = content.replaceAll("import.meta", "''");
        }

        return new Response(
            content,
            {
                status: 200,
                headers: {
                    "content-type": contentType,
                    // "content-length": "" + file.size
                }
            });
    }
    catch {
        return new Response("", {status: 404});
    }
}

let gTempDirPath = path.join("node_modules", ".reactHydrateCache");

//endregion

//region UI

export function hasHydrateComponents() {
    return gHasComponents;
}

export function getHydrateComponents() {
    return gHydrateComponents;
}

interface JopiHydrateProps {
    Child: React.FunctionComponent;
    args: any,
    id: string;
    asSpan: boolean;
}

function useHydrateComponent(importMeta: { filename: string }): string {
    if (NodeSpace.what.isServerSide) {
        const key = nCrypto.fastHash(importMeta.filename).toString();
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

function JopiHydrate({id, args, asSpan, Child,}: JopiHydrateProps) {
    const props = {"jopi-hydrate": JSON.stringify({id, args})};

    if (asSpan) {
        return <span {...props}><Child {...args}>{}</Child></span>;
    }

    return <div {...props}><Child {...args}>{}</Child></div>;
}

function onNewHydrate(importMeta: {filename: string}, f: React.FunctionComponent, isSpan: boolean): React.FunctionComponent {
    // Register the component.
    const id = useHydrateComponent(importMeta);

    // Wrap our component.
    return (p:any) => <JopiHydrate id={id} args={p} asSpan={isSpan} Child={f as React.FunctionComponent} />;
}

const gHydrateComponents: {[key: string]: string} = {};
let gHasComponents = false;

setNewHydrateListener(onNewHydrate);

//endregion