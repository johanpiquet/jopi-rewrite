import { pipeline } from "node:stream/promises";
import { createReadStream, createWriteStream } from "node:fs";
import { createGunzip, createGzip } from "node:zlib";
import path from 'node:path';
import fs from 'node:fs/promises';
export async function gzipFile(inputPath, outputPath) {
    try {
        await pipeline(createReadStream(inputPath), createGzip(), createWriteStream(outputPath));
    }
    catch (e) {
        console.error("Can't gzip file", inputPath, e);
    }
}
export async function gunzipFile(inputPath, outputPath) {
    try {
        await pipeline(createReadStream(inputPath), createGunzip(), createWriteStream(outputPath));
    }
    catch (e) {
        console.error("Can't gunzip file", inputPath, e);
    }
}
export async function mkDirForFile(filePath) {
    const directoryPath = path.dirname(filePath);
    await fs.mkdir(directoryPath, { recursive: true });
}
export async function saveReadableStreamToFile(filePath, stream) {
    await NodeSpace.fs.writeResponseToFile(new Response(stream), filePath);
}
//# sourceMappingURL=gzip.js.map