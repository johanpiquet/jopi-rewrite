import {gzipFile} from "../gzip.ts";
import path from "node:path";
import fs from "node:fs/promises";
import fss from "node:fs";
import type {CacheEntry, PageCache} from "./cache.ts";
import {cacheEntryToResponse, makeIterable, responseToCacheEntry} from "../internalTools.ts";

const nCrypto = NodeSpace.crypto;
const nFS = NodeSpace.fs;
const nCompress = NodeSpace.compress;

export class SimpleFileCache implements PageCache {
    public readonly rootDir: string;
    
    constructor(rootDir: string) {
        if (!rootDir) rootDir = ".";
        if (!path.isAbsolute(rootDir)) rootDir = path.resolve(process.cwd(), rootDir);
        this.rootDir = rootDir;
    }

    private calKey(url: URL): string {
        // Using a hash allows avoiding difficulties with query string special characters.
        return nCrypto.fastHash(url.toString());
    }

    private calcFilePath(url: URL): string {
        const key = this.calKey(url);
        let fp = path.join(this.rootDir, key[0], key);
        if (fp.endsWith("/")) fp += "index.html";
        return fp;
    }

    async addToCache(url: URL, response: Response, headersToInclude: string[]|undefined, storeUncompressed: boolean): Promise<Response> {
        // >>> Store the infos.

        await this.saveNewCacheEntry(url, response, headersToInclude, !storeUncompressed);

        // >>> Store the body.

        // Don't store the body if it's not a 200.
        // If 404 with body: must be handled as a special case by the caller.
        //
        if (response.status!==200) {
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
        } else {
            const result = nFS.createResponseFromFile(filePath + " gz", response.status, response.headers);
            result.headers.set("content-encoding", "gzip");
            return result;
        }
    }

    async removeFromCache(url: URL): Promise<void> {
        const filePath = this.calcFilePath(url);

        await nFS.unlink(filePath);
        await nFS.unlink(filePath + " gz");
        await nFS.unlink(filePath + " info");

        return Promise.resolve();
    }

    async getFromCache(url: URL, getGzippedVersion: boolean): Promise<Response|undefined> {
        const cacheEntry = await this.getCacheEntry(url);

        // Mean the entry doesn't exist.
        if (!cacheEntry) {
            return undefined;
        }

        if (cacheEntry.status===200) {
            let mustUnzip = false;

            // Fallback to zip/unzip version.
            //
            if (cacheEntry.isGzipped) {
                if (!getGzippedVersion) {
                    getGzippedVersion = true;
                    mustUnzip = true;
                }
            } else {
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

                    cacheEntry.binary = stream.buffer as ArrayBuffer;
                    cacheEntry.binarySize = stream.length;
                } else {
                    cacheEntry.binary = fileBytes.buffer as ArrayBuffer;
                    cacheEntry.binarySize = fileBytes.length;
                }
            }
        }

        return cacheEntryToResponse(cacheEntry);
    }

    async hasInCache(url: URL, requireUncompressedVersion?: boolean|undefined): Promise<boolean> {
        const cacheEntry = await this.getCacheEntry(url);
        if (!cacheEntry) return false;

        if (requireUncompressedVersion===undefined) return true;
        if (requireUncompressedVersion) return cacheEntry.isGzipped===false;
        return cacheEntry.isGzipped===true;
    }

    private async getCacheEntry(url: URL): Promise<CacheEntry|undefined> {
        const filePath = this.calcFilePath(url);

        try {
            return JSON.parse(await nFS.readTextFromFile(filePath + " info"));
        }
        catch {
            // We are here if the file doesn't exist.
            return undefined;
        }
    }

    private async saveNewCacheEntry(url: URL, response: Response, headersToInclude: string[]|undefined, isGzipped: boolean) {
        const cacheEntry = responseToCacheEntry(url.href, response, headersToInclude, isGzipped);
        return this.saveCacheEntry(url, cacheEntry);
    }

    private async saveCacheEntry(url: URL, cacheEntry: CacheEntry) {
        const filePath = this.calcFilePath(url) + " info";
        await fs.mkdir(path.dirname(filePath), {recursive: true});
        await nFS.writeTextToFile(filePath, JSON.stringify(cacheEntry));
    }

    createSubCache(name: string): PageCache {
        const newDir = path.join(this.rootDir, "_ subCaches", name);
        return new SimpleFileCache(newDir);
    }

    getCacheEntryIterator() {
        function getCacheEntryFrom(filePath: string): CacheEntry|undefined {
            try {
                return JSON.parse(nFS.readTextSyncFromFile(filePath));
            }
            catch {
                // We are here if the file doesn't exist.
                return undefined;
            }
        }

        const rootDir = this.rootDir;
        const nextFileProvider = iterateFiles(this.rootDir);

        return makeIterable({
            next(): IteratorResult<CacheEntry> {
                while (true) {
                    let nextFile = nextFileProvider.next();
                    if (nextFile.done) return {done: true, value: undefined};

                    const cacheEntry = getCacheEntryFrom(path.join(rootDir, nextFile.value));
                    if (cacheEntry) return {done: false, value: cacheEntry};
                }
            }
        });
    }

    getSubCacheIterator() {
        const alreadyReturned: string[] = [];
        const iterator = iterateFiles(this.rootDir);

        return makeIterable({
            next(): IteratorResult<string> {
                while (true) {
                    const result = iterator.next();
                    if (!result.done) return {value: undefined, done: true};

                    const filePath = result.value[0];

                    if (filePath.startsWith("_ subCaches")) {
                        const parts = filePath.split(path.sep);
                        const subCacheName = parts[1];

                        if (!alreadyReturned.includes(subCacheName)) {
                            alreadyReturned.push(subCacheName);
                            return {value: subCacheName, done: false};
                        }
                    }
                }
            }
        });
    }
}

function* iterateFiles(rootDir: string): Generator<string> {
    const items = fss.readdirSync(rootDir);

    for (const item of items) {
        const itemPath = path.join(rootDir, item);
        const stats = fss.statSync(itemPath);

        if (stats.isDirectory()) {
            yield* iterateFiles(itemPath);
        } else if (stats.isFile() && item.endsWith(' info')) {
            const relativePath = path.relative(rootDir, itemPath);
            yield relativePath;
        }
    }
}