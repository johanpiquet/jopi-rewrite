import { type BuildOptions, type Plugin } from "esbuild";
export interface EsBuildParams {
    entryPoint: string;
    outputDir: string;
    publicPath?: string;
    plugins?: Plugin[];
    overrideConfig?: BuildOptions;
}
export declare function esBuildBundle(params: EsBuildParams): Promise<void>;
export declare const jopiReplaceServerPlugin: Plugin;
export declare const jopiCssPlugin: Plugin;
