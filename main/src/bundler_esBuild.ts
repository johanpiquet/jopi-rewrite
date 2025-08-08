import esbuild, {type BuildOptions, type Plugin} from "esbuild";
import sassPlugin from 'esbuild-plugin-sass';
import fs from "node:fs/promises";

export interface EsBuildParams {
    entryPoint: string;
    outputDir: string;
    publicPath?: string;
    plugins?: Plugin[];

    overrideConfig?: BuildOptions;
}

export async function esBuildBundle(params: EsBuildParams) {
    if (!params.plugins) params.plugins = [];

    // @ts-ignore
    globalThis.esBuildIsRunning = true;

    const res = await esbuild.build({
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
            // Médias
            '.mp3': 'file',
            '.mp4': 'file',
            // Autres
            '.html': 'text',
            '.md': 'text'
        },

        minify: true,
        sourcemap: true,

        ...params.overrideConfig
    });

    // @ts-ignore
    globalThis.esBuildIsRunning = false;
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