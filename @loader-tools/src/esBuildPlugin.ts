import cssModuleCompiler from "./cssModuleCompiler.ts";
import {transformFile} from "./transform.ts";
import {getImportTransformConfig} from "./config.ts";
import path from "node:path";
import fs from "node:fs";
import * as ns_app from "jopi-node-space/ns_app";
import * as ns_fs from "jopi-node-space/ns_fs";

// Note: Bun.js plugins are partially compatible with EsBuild modules.

interface JopiRawContent {
    file: string;
    type: string
}

async function processCssModule(path: string) {
    let jsSource = await cssModuleCompiler(path);

    return {
        contents: jsSource,
        loader: "js",
    };
}

async function inlineAndRawModuleHandler(options: string, resPath: string) {
    // Occurs when it's compiled with TypeScript.
    if (!await ns_fs.isFile(resPath)) {
        resPath = ns_app.requireSourceOf(resPath);
    }

    let res = await transformFile(resPath, options);

    return {
        contents: res.text,
        loader: "js",
    };
}

export function resolveAndCheckPath(filePath: string, resolveDir: string): {path?: string, error?: string} {
    let absolutePath: string;

    if (path.isAbsolute(filePath)) {
        absolutePath = filePath;
    } else {
        absolutePath = path.resolve(resolveDir, filePath);
    }

    try {
        fs.accessSync(absolutePath);
        return { path: absolutePath };
    } catch (error) {
        return { error: `Resource not found: ${absolutePath}` };
    }
}

function createJopiRawFile(targetFilePath: string, processType: string): any {
    // Bun.js load doesn't support having an '?' in the path.
    // It's why we do strange things here to process this case.
    //
    // Also, there are strange behaviors that we avoid when using this strategy.

    let options = getImportTransformConfig();
    let tempDir = options?.bundlerOutputDir || path.join(ns_app.getTempDir(), "bunjs");
    fs.mkdirSync(tempDir, {recursive: true});

    let fileName = path.resolve(tempDir, (gNextTempFileName++) + ".jopiraw");
    fs.writeFileSync(fileName, JSON.stringify({file: targetFilePath, type: processType}));

    return {
        // The file must exist, otherwise
        // an exception is triggered :-(
        path: fileName
    };
}

export function installEsBuildPlugins(build: Bun.PluginBuilder) {
    build.onResolve({filter: /\.module\.(css|scss)$/}, (args) => {
        const result = resolveAndCheckPath(args.path, path.dirname(args.importer));

        if (result.error) {
            return {
                errors: [{
                    text: result.error
                }]
            };
        }

        //@ts-ignore
        return createJopiRawFile(result.path!, "cssmodule");
    });

    // @ts-ignore
    build.onResolve({filter: /\?(?:inline|raw)$/}, async (args) => {
        let [filePath, option] = args.path.split('?');

        const result = resolveAndCheckPath(filePath, path.dirname(args.importer));

        if (result.error) {
            return {
                errors: [{
                    text: result.error
                }]
            };
        }

        //@ts-ignore
        return createJopiRawFile(result.path!, "option-" + option);
    });

    // @ts-ignore
    build.onLoad({filter: /\.jopiraw$/},  async (args) => {
        let json = JSON.parse(await ns_fs.readTextFromFile(args.path)) as JopiRawContent;
        await ns_fs.unlink(args.path);

        let filePath = json.file;

        switch (json.type) {
            case "option-inline":
                return inlineAndRawModuleHandler("inline", filePath);
            case "option-raw":
                return inlineAndRawModuleHandler("raw", filePath);
            case "cssmodule":
                return processCssModule(filePath);
        }
    });
}

let gNextTempFileName = 1;