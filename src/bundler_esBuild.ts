import esbuild, {type BuildOptions, type Plugin} from "esbuild";
import sassPlugin from 'esbuild-plugin-sass';
import fs from "node:fs/promises";
import path from "node:path";
import {cssModuleHandler} from "@jopi-loader/tools";
import {getAssetsHash} from "@jopi-loader/client";
import {inlineAndRawModuleHandler} from "@jopi-loader/tools/dist/esBuildPlugin.js";

async function resolveAndCheckPath(filePath: string, resolveDir: string): Promise<{path?: string, error?: string}> {
    let absolutePath: string;

    if (path.isAbsolute(filePath)) {
        absolutePath = filePath;
    } else {
        absolutePath = path.resolve(resolveDir, filePath);
    }

    try {
        await fs.access(absolutePath);
        return { path: absolutePath };
    } catch (error) {
        return { error: `Resource not found: ${absolutePath}` };
    }
}

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
            sassPlugin(),
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
        build.onResolve({ filter: /\?(?:inline|raw)$/ }, async (args) => {
            let [filePath, option] = args.path.split('?');

            const result = await resolveAndCheckPath(filePath, args.resolveDir);

            if (result.error) {
                return {
                    errors: [{
                        text: result.error,
                        location: null,
                    }]
                };
            }

            return {
                path: result.path + "?" + option,
                namespace: 'jopi-transform'
            };
        });

        build.onResolve({ filter: /\.(css|scss)$/ }, async (args) => {
            const result = await resolveAndCheckPath(args.path, args.resolveDir);

            if (result.error) {
                return {
                    errors: [{
                        text: result.error,
                        location: null,
                    }]
                };
            }

            return {
                path: result.path,
                namespace: 'jopi-css-modules'
            };
        });

        // @ts-ignore
        build.onLoad({ filter: /.*/, namespace: 'jopi-transform' }, inlineAndRawModuleHandler);

        // @ts-ignore
        build.onLoad({ filter: /.*/, namespace: 'jopi-css-modules' }, cssModuleHandler);
    },
};