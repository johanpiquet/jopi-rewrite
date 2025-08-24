import { cacheEntryToResponse, MetaUpdaterResult, responseToCacheEntry } from "../core.js";
import { gzipFile } from "../gzip.js";
import path from "node:path";
import fs from "node:fs/promises";
const nCrypto = NodeSpace.crypto;
const nFS = NodeSpace.fs;
const nCompress = NodeSpace.compress;
export class SimpleFileCache {
    rootDir;
    constructor(rootDir) {
        if (!rootDir)
            rootDir = ".";
        if (!path.isAbsolute(rootDir))
            rootDir = path.resolve(process.cwd(), rootDir);
        this.rootDir = rootDir;
    }
    calKey(url) {
        // Using a hash allows avoiding difficulties with query string special characters.
        return nCrypto.fastHash(url.toString());
    }
    calcFilePath(url) {
        const key = this.calKey(url);
        let fp = path.join(this.rootDir, key[0], key);
        if (fp.endsWith("/"))
            fp += "index.html";
        return fp;
    }
    async addToCache(url, response, headersToInclude, storeUncompressed, metaUpdater) {
        let meta;
        if (metaUpdater) {
            const murData = metaUpdater.data;
            if (metaUpdater.requireCurrentMeta) {
                const cacheEntry = await this.getCacheEntry(url);
                if (cacheEntry)
                    meta = cacheEntry.meta;
            }
            meta = meta || {};
            const mur = metaUpdater.updateMeta(meta, murData);
            if (mur === MetaUpdaterResult.MUST_DELETE)
                meta = undefined;
            else if (mur === MetaUpdaterResult.IS_NOT_UPDATED)
                meta = undefined;
        }
        // >>> Store the infos.
        await this.saveNewCacheEntry(url, response, headersToInclude, meta, !storeUncompressed);
        // >>> Store the body.
        // Don't store the body if it's not a 200.
        // If 404 with body: must be handled as a special case by the caller.
        //
        if (response.status !== 200) {
            return response;
        }
        const filePath = this.calcFilePath(url);
        await nFS.writeResponseToFile(response, filePath);
        if (!storeUncompressed) {
            await gzipFile(filePath, filePath + " gz");
            await nFS.unlink(filePath);
        }
        if (storeUncompressed) {
            const result = nFS.createResponseFromFile(filePath, response.status, response.headers);
            result.headers.delete("content-encoding");
            return result;
        }
        else {
            const result = nFS.createResponseFromFile(filePath + " gz", response.status, response.headers);
            result.headers.set("content-encoding", "gzip");
            return result;
        }
    }
    async removeFromCache(url) {
        const filePath = this.calcFilePath(url);
        await nFS.unlink(filePath);
        await nFS.unlink(filePath + " gz");
        await nFS.unlink(filePath + " info");
        return Promise.resolve();
    }
    async getFromCache(url, getGzippedVersion, metaUpdater) {
        const cacheEntry = await this.getCacheEntry(url);
        // Mean the entry doesn't exist.
        if (!cacheEntry) {
            return undefined;
        }
        let meta;
        if (metaUpdater) {
            const murData = metaUpdater.data;
            if (metaUpdater.requireCurrentMeta)
                meta = cacheEntry.meta;
            let bckMeta = meta;
            meta = meta || {};
            const mur = metaUpdater.updateMeta(meta, murData);
            if (mur !== MetaUpdaterResult.IS_NOT_UPDATED) {
                if (mur === MetaUpdaterResult.MUST_DELETE) {
                    if (bckMeta !== undefined) {
                        cacheEntry.meta = undefined;
                        await this.saveCacheEntry(url, cacheEntry);
                    }
                }
                else {
                    cacheEntry.meta = meta;
                    await this.saveCacheEntry(url, cacheEntry);
                }
            }
        }
        if (cacheEntry.status === 200) {
            let mustUnzip = false;
            // Fallback to zip/unzip version.
            //
            if (cacheEntry.isGzipped) {
                if (!getGzippedVersion) {
                    getGzippedVersion = true;
                    mustUnzip = true;
                }
            }
            else {
                if (getGzippedVersion) {
                    getGzippedVersion = false;
                }
            }
            const baseFilePath = this.calcFilePath(url);
            const filePath = getGzippedVersion ? baseFilePath + " gz" : baseFilePath;
            if (await nFS.isFile(filePath)) {
                const fileBytes = await nFS.readFileToBytes(filePath);
                if (mustUnzip) {
                    const stream = nCompress.gunzipSync(fileBytes);
                    cacheEntry.binary = stream.buffer;
                    cacheEntry.binarySize = stream.length;
                }
                else {
                    cacheEntry.binary = fileBytes.buffer;
                    cacheEntry.binarySize = fileBytes.length;
                }
            }
        }
        return cacheEntryToResponse(cacheEntry);
    }
    async hasInCache(url, requireUncompressedVersion) {
        const cacheEntry = await this.getCacheEntry(url);
        if (!cacheEntry)
            return false;
        if (requireUncompressedVersion === undefined)
            return true;
        if (requireUncompressedVersion)
            return cacheEntry.isGzipped === false;
        return cacheEntry.isGzipped === true;
    }
    async getMeta(url) {
        const infos = await this.getCacheEntry(url);
        if (!infos)
            return undefined;
        return infos.meta;
    }
    async getCacheEntry(url) {
        const filePath = this.calcFilePath(url);
        try {
            return JSON.parse(await nFS.readTextFromFile(filePath + " info"));
        }
        catch {
            // We are here if the file doesn't exist.
            return undefined;
        }
    }
    async saveNewCacheEntry(url, response, headersToInclude, meta, isGzipped) {
        const cacheEntry = responseToCacheEntry(response, headersToInclude, meta, isGzipped);
        return this.saveCacheEntry(url, cacheEntry);
    }
    async saveCacheEntry(url, cacheEntry) {
        const filePath = this.calcFilePath(url) + " info";
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await nFS.writeTextToFile(filePath, JSON.stringify(cacheEntry));
    }
    createSubCache(name) {
        const newDir = path.join(this.rootDir, "_ subCaches", name);
        return new SimpleFileCache(newDir);
    }
}
//# sourceMappingURL=SimpleFileCache.js.map