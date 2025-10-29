import {supportedExtensionsRegExp} from "./rules.ts";
import {transformFile} from "./transform.ts";
import {installEsBuildPlugins} from "./esBuildPlugin.js";
import fs from "node:fs/promises";
import path from "node:path";
import MagicString from "magic-string";
import {SourceMapConsumer, SourceMapGenerator} from "source-map";

// https://bun.com/docs/runtime/plugins

export function installBunJsLoader() {
    Bun.plugin({
        name: "jopi-loader",
        setup(build) {
            // For module.css and imports with ?inline and ?raw
            installEsBuildPlugins(build);

            // For .css/.scss/.png/.txt/...
            build.onLoad({filter: supportedExtensionsRegExp}, async ({path}) => {
                let idx = path.indexOf("?");
                let options = "";

                if (idx !== -1) {
                    options = path.substring(idx + 1);
                    path = path.substring(0, idx);
                }

                const res = await transformFile(path, options);

                return {
                    contents: res.text,
                    loader: "js",
                };
            });

            build.onLoad({ filter: /\.(tsx|ts)$/ }, async ({path: p2}) => {
                const oldContent = await fs.readFile(p2, 'utf8');
                let newContent = oldContent;

                if (process.env.JOPI_BUNJS_REPLACE_TEXT==="1") {
                    debugger;
                    newContent = oldContent.replace("jBundler_ifServer", "jBundler_ifBrowser");
                }

                let loader = path.extname(p2).toLowerCase().substring(1);

                return {
                    contents: newContent,
                    loader: loader as 'js' | 'jsx' | 'ts' | 'tsx'
                };
            });
        }
    });
}