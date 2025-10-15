import esbuild, {type BuildResult, type Plugin} from "esbuild";
import fs from "node:fs/promises";
import {installEsBuildPlugins} from "jopi-rewrite/loader-tools";
import * as ns_fs from "jopi-node-space/ns_fs";
import * as n_what from "jopi-node-space/ns_what";
import {askRefreshingBrowser} from "jopi-rewrite/loader-client";

export interface EsBuildParams {
    entryPoint: string;
    cssToAdd: string[];
    outputDir: string;
    genDir: string;
    publicPath?: string;
    metaDataFilePath: string;
    useWatchMode?: boolean;
    dontEmbed?: string[]
}

export async function esBuildBundle(params: EsBuildParams) {
    // To know: will generate:
    // * A file out/loader.js   with the JS include by loader.jsx
    // * A file out/loader.css  with the CSS include by loader.jsx

    const buildOptions: esbuild.BuildOptions = {
        entryPoints: [params.entryPoint],

        bundle: true,
        outdir: params.outputDir,

        external:  params.dontEmbed,

        // Allows generating relative url
        // without the full website name.
        //
        publicPath: "/_bundle/",

        platform: 'browser',
        format: 'esm',
        target: "es2020",

        splitting: true,

        plugins: [
            // SCSS is natively managed.

            jopiLoaderPlugin,
            jopiReplaceServerPlugin,
            jopiDetectRebuild
        ],

        loader: {
            ".css": "css",
            ".scss": "css",

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

            // Media
            '.mp3': 'file',
            '.mp4': 'file',

            // Others
            '.html': 'text',
            '.md': 'text'
        },

        minify: true,
        sourcemap: true,

        // Will trigger an error on collision detection.
        allowOverwrite: false,

        // Produce metadata about the build.
        metafile: true
    };
    const context = await esbuild.context(buildOptions);
    let result: BuildResult = await context.rebuild();

    if (params.useWatchMode) {
        try {
            gEnableRebuildWatch = true;
            await context.watch({
                delay: n_what.isNodeJS ? 100 : 0
            });
        } catch {
            process.exit(1);
        }
    }

    // >>> Generate report files

    // File 1: 'raw-meta.json' contains the raw report of EsBuild.
    // File 2:

    // Here we are not in the same process, so we can't
    // store the mapping in memory.

    const allMeta = result.metafile!;
    await ns_fs.writeTextToFile(ns_fs.join(params.genDir, "raw-meta.json"), JSON.stringify(allMeta, null, 4));

    const jsonReport: Record<string, string> = {};

    if (allMeta.outputs) {
        for (const outputFilePath in allMeta.outputs) {
            const ext = ns_fs.extname(outputFilePath);
            if ([".js", ".ts", ".tsx", ".jsx", ".mjs"].includes(ext)) continue;

            const metaValue = allMeta.outputs[outputFilePath];

            if (metaValue.inputs) {
                const inputs = metaValue.inputs;

                for (let inputFilePath of Object.keys(inputs)) {
                    // Don't override if already set because the next
                    // entry can be a resource using our entry, so it
                    // will be overridden.
                    //
                    let key = ns_fs.resolve(inputFilePath);
                    if (!jsonReport[key]) jsonReport[key] = outputFilePath;
                }
            }
        }
    }

    await ns_fs.writeTextToFile(params.metaDataFilePath, JSON.stringify(jsonReport, null, 4));
}

// Allow replacing jopi-node-space-server by jopi-node-space-browser.
// Is required by jopi-node-space.
//
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

/**
 * Allows managing custom import:
 * * Importing CSS modules (.module.css)
 * * Import with ?raw and ?inline
 */
const jopiLoaderPlugin: Plugin = {
    name: "jopi-loader",
    setup(build) {
        installEsBuildPlugins(build as unknown as Bun.PluginBuilder)
    },
};

const jopiDetectRebuild: Plugin = {
    name:"jopi-detect-rebuild",
    setup(build) {
        build.onEnd(() => {
            if (!gEnableRebuildWatch) return;
            console.log("🔥 JopiN - UI change detected: refreshing browser");
            askRefreshingBrowser();
        });
    }
}

let gEnableRebuildWatch = false;