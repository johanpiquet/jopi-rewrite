export declare function gzipFile(inputPath: string, outputPath: string): Promise<void>;
export declare function gunzipFile(inputPath: string, outputPath: string): Promise<void>;
export declare function mkDirForFile(filePath: string): Promise<void>;
export declare function saveReadableStreamToFile(filePath: string, stream: ReadableStream<Uint8Array>): Promise<void>;
