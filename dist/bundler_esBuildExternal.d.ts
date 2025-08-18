import type { BuildOptions } from "esbuild";
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
export declare function esBuildBundleExternal(params: EsBuildExternalParams, doDirectCall?: boolean): Promise<void>;
