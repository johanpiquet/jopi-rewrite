import esbuild, {type BuildOptions, type Plugin} from "esbuild";
import fs from "node:fs/promises";
import {getAssetsHash} from "@jopi-loader/client";
import {installEsBuildPlugins} from "@jopi-loader/tools";

export interface EsBuildParams {
    entryPoint: string;
    outputDir: string;
    publicPath?: string;
    plugins?: Plugin[];

    overrideConfig?: BuildOptions;
}

export async function esBuildBundle(params: EsBuildParams) {
    if (!params.plugins) params.plugins = [];

    await esbuild.build({
        entryPoints: [params.entryPoint],
        bundle: true,
        outdir: params.outputDir,
        platform: 'browser',
        format: 'esm',
        target: "es2020",
        publicPath: params.publicPath,
        splitting: true,

        plugins: [
            jopiPlugin,
            //sassPlugin(),
            ...params.plugins,
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

        ...params.overrideConfig,

        //entryNames: '[dir]/[name]',
        assetNames: '[name]-' + getAssetsHash(),
    });
}

// Allow replacing jopi-node-space-server by jopi-node-space-browser.
// Is required by jopi-node-space.
//
export const jopiReplaceServerPlugin: Plugin = {
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

export const jopiPlugin: Plugin = {
    name: "jopi-loader",
    setup(build) {
        installEsBuildPlugins(build as unknown as Bun.PluginBuilder)
    },
};