import {execFile} from "node:child_process";
import {esBuildBundle, type EsBuildParams, jopiReplaceServerPlugin} from "./bundler_esBuild.ts";
import type {BuildOptions} from "esbuild";

export interface EsBuildExternalParams {
    entryPoint: string;
    outputDir: string;
    publicPath?: string;
    usePlugins?: string[];
    overrideConfig?: BuildOptions;
}

/**
 * Will execute EsBuild from a separate process.
 * The file will call himself with the parameters for calling esbuild.
 * And process the call.
 */
export async function esBuildBundleExternal(params: EsBuildExternalParams, doDirectCall = false) {
    if (doDirectCall) {
        let config = params;
        let config2 = config as EsBuildParams;

        if (config.usePlugins && config.usePlugins.length > 0) {
            if (config.usePlugins[0] === "jopiReplaceServerPlugin") {
                config2.plugins = [jopiReplaceServerPlugin];
            }
        }

        await esBuildBundle(config2);

        return;
    }

    let thisFile = import.meta.filename;
    let jsonParams = JSON.stringify(params);

    let nodeJsPath = process.argv[0];
    const args = [thisFile, "--import", "jopi-loader", "--", "--jopi-bundler", jsonParams];

    // Will allow this function to be really async.
    //
    return new Promise<void>((resolve, reject) => {
        // Here execFile is better than "exec" since it automatically encodes the arguments.
        //
        execFile(
            nodeJsPath, args, {cwd: process.cwd()}, (error, _stdout, stderr) => {
                if (error) {
                    console.error(`Error when executing EsBuild:\n${stderr}`);
                    reject(error);
                } else {
                    resolve();
                }
            });
    });
}

// The current version of Node.js doesn't support "import.meta.main".
// It's why we need this special flag.
//
if (process.argv.includes("--jopi-bundler")) {
    async function bundle() {
        let jsonEncoded = process.argv[process.argv.indexOf("--jopi-bundler") + 1];
        let config = JSON.parse(jsonEncoded) as EsBuildExternalParams;
        await esBuildBundleExternal(config, true);
    }

    bundle().then();
}