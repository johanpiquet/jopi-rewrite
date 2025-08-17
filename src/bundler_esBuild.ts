import esbuild, {type BuildOptions, type Plugin} from "esbuild";
import sassPlugin from 'esbuild-plugin-sass';
import fs from "node:fs/promises";
import {cssModuleHandler} from "jopi-loader";

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
            sassPlugin(),
            jopiCssPlugin,
            ...params.plugins
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

        ...params.overrideConfig
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

export const jopiCssPlugin: Plugin = {
    name: "jopi-loader",
    setup(build) {
        // @ts-ignore
        build.onLoad({filter: /\.(css|scss)$/}, cssModuleHandler);
    },
};