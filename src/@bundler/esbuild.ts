import esbuild, {type BuildResult} from "esbuild";
import * as jk_fs from "jopi-toolkit/jk_fs";
import * as n_what from "jopi-toolkit/jk_what";
import type {CreateBundleParams} from "../@core/index.ts";
import {jopiReplaceText, jopiLoaderPlugin, jopiDetectRebuild} from "./plugins.ts";
import {applyTailwindProcessor} from "./tailwind.ts";

export interface EsBuildParams extends CreateBundleParams {
    metaDataFilePath: string;
    dontEmbed: string[]|undefined;
}

export async function esBuildBundle(params: EsBuildParams) {
    // To know: will generate:
    // * Some files out/page_xxxx.js, where each page is an "page.tsx".
    // * Some files out/page_xxxx.css with the CSS specific to this page.

    const buildOptions: esbuild.BuildOptions = {
        entryPoints: params.entryPoints,

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
            jopiLoaderPlugin,
            jopiReplaceText(),
            jopiDetectRebuild(params)
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
        //minify: false,
        sourcemap: true,

        // Will trigger an error on collision detection.
        allowOverwrite: false,

        // Produce metadata about the build.
        metafile: true
    };

    // Note: each page is compiled one time.
    // Once compiled, the watch mode will refresh it.
    //
    if (params.singlePageMode) {
        buildOptions.publicPath += params.pageKey! + '/';
        buildOptions.entryPoints = [params.pageScript!];
        buildOptions.outdir = jk_fs.join(buildOptions.outdir!, params.pageKey!);
    }

    await applyTailwindProcessor(params);

    const context = await esbuild.context(buildOptions);
    let result: BuildResult = await context.rebuild();

    if (params.enableUiWatch) {
        try {
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
    await jk_fs.writeTextToFile(jk_fs.join(params.genDir, "raw-meta.json"), JSON.stringify(allMeta, null, 4));

    const jsonReport: Record<string, string> = {};

    if (allMeta.outputs) {
        for (const outputFilePath in allMeta.outputs) {
            const ext = jk_fs.extname(outputFilePath);
            if ([".js", ".ts", ".tsx", ".jsx", ".mjs"].includes(ext)) continue;

            const metaValue = allMeta.outputs[outputFilePath];

            if (metaValue.inputs) {
                const inputs = metaValue.inputs;

                for (let inputFilePath of Object.keys(inputs)) {
                    // Don't override if already set because the next
                    // entry can be a resource using our entry, so it
                    // will be overridden.
                    //
                    let key = jk_fs.resolve(inputFilePath);
                    if (!jsonReport[key]) jsonReport[key] = outputFilePath;
                }
            }
        }
    }

    await jk_fs.writeTextToFile(params.metaDataFilePath, JSON.stringify(jsonReport, null, 4));
}