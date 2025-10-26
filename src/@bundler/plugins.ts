import {type Plugin} from "esbuild";
import fs from "node:fs/promises";
import path from "node:path";
import {applyTailwindProcessor} from "./tailwind.ts";
import * as jk_events from "jopi-toolkit/jk_events";
import type {EsBuildParams} from "./esbuild.ts";
import type {CreateBundleEvent} from "../@core/index.ts";
import * as jk_fs from "jopi-toolkit/jk_fs";
import * as jk_crypto from "jopi-toolkit/jk_crypto";
import {installEsBuildPlugins} from "jopi-rewrite/loader-tools";
import MagicString from 'magic-string';
import {SourceMapConsumer, SourceMapGenerator} from "source-map";

/**
 * This plugin allows replacing some text entries according to rules.
 */
export function jopiReplaceText(replaceRules: Record<string, string>|undefined): Plugin {
    async function getExistingSourceMap(filePath: string, source: string): Promise<string | null> {
        const sourceMapCommentMatch = source.match(/\/\/# sourceMappingURL=(.+)$/m);
        if (!sourceMapCommentMatch) return null;

        const sourceMapUrl = sourceMapCommentMatch[1];

        if (sourceMapUrl.startsWith('data:application/json;base64,')) {
            const base64Content = sourceMapUrl.replace('data:application/json;base64,', '');
            return Buffer.from(base64Content, 'base64').toString('utf8');
        } else {
            const sourceMapPath = path.resolve(path.dirname(filePath), sourceMapUrl);
            try {
                return await fs.readFile(sourceMapPath, 'utf8');
            } catch {
                return null;
            }
        }
    }

    return {
        name: "jopi-replace-text",

        setup(build) {
            build.onLoad({ filter: /\.(tsx|jsx|js)$/ }, async (args) => {
                const oldContent = await fs.readFile(args.path, 'utf8');
                let newContent = oldContent;

                for (let toReplace in replaceRules) {
                    newContent = newContent.replace(toReplace, replaceRules[toReplace]);
                }

                if (newContent === oldContent) return null;
                const useSourceMap = !!build.initialOptions.sourcemap;

                if (!useSourceMap) {
                    let loader = path.extname(args.path).toLowerCase().substring(1);
                    return {contents: newContent, loader: loader as 'js' | 'jsx' | 'ts' | 'tsx'};
                }

                const existingSourceMap = await getExistingSourceMap(args.path, oldContent);
                //const existingSourceMap = undefined;
                const magic = new MagicString(oldContent, {filename: args.path});

                for (let toReplace in replaceRules) {
                    magic.replace(toReplace, replaceRules[toReplace]);
                }

                const map = magic.generateMap({
                    file: args.path,
                    source: path.basename(args.path),
                    includeContent: true,
                    hires: true
                });

                let finalMap: string;

                // Will merge the existing and final source-map.
                //
                if (existingSourceMap) {
                    const consumerExisting = await new SourceMapConsumer(existingSourceMap);
                    const generator = SourceMapGenerator.fromSourceMap(consumerExisting);

                    // Parser la nouvelle sourcemap générée par magic-string
                    const consumerNew = await new SourceMapConsumer(JSON.parse(map.toString()));
                    consumerNew.eachMapping((mapping) => {
                        if (mapping.originalLine != null && mapping.originalColumn != null) {
                            generator.addMapping({
                                source: mapping.source || path.basename(args.path),
                                original: { line: mapping.originalLine, column: mapping.originalColumn },
                                generated: { line: mapping.generatedLine, column: mapping.generatedColumn },
                                name: mapping.name,
                            });
                        }
                    });

                    // Ajouter les contenus des sources de la nouvelle sourcemap
                    consumerNew.sources.forEach((source, i) => {
                        const content = consumerNew.sourceContentFor(source, true);
                        if (content) {
                            generator.setSourceContent(source, content);
                        }
                    });

                    finalMap = JSON.stringify(generator.toJSON());
                    consumerNew.destroy();
                    consumerExisting.destroy();
                } else {
                    finalMap = map.toString();
                }

                newContent = magic.toString() +
                    `\n//# sourceMappingURL=data:application/json;base64,${Buffer.from(finalMap).toString('base64')}`;

                let loader = path.extname(args.path).toLowerCase().substring(1);
                return {contents: newContent, loader: loader as 'js' | 'jsx' | 'ts' | 'tsx'};
            });
        }
    };
}

export function jopiDetectRebuild(params: EsBuildParams): Plugin {
    let isFirstCall = true;

    return {
        name: "jopi-detect-rebuild",
        setup(build) {
            build.onStart(async () => {
                if (params.requireTailwind) {
                    await applyTailwindProcessor(params);
                }

                if (!isFirstCall && params.enableUiWatch) {
                    await jk_events.sendAsyncEvent("jopi.bundler.watch.beforeRebuild");
                }
            });

            build.onEnd(async () => {
                isFirstCall = false;

                if (params.enableUiWatch) {
                    await jk_events.sendAsyncEvent("jopi.bundler.watch.afterRebuild");
                }
            });
        }
    }
}

/**
 * Allows managing custom import:
 * * Importing CSS modules (.module.css)
 * * Import with ?raw and ?inline
 */
export const jopiLoaderPlugin: Plugin = {
    name: "jopi-loader",
    setup(build) {
        installEsBuildPlugins(build as unknown as Bun.PluginBuilder)
    },
};