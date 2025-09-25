import {gzipFile, mkDirForFile, saveReadableStreamToFile} from "../gzip.ts";

import * as path from "node:path";
import type {CacheEntry, PageCache} from "./cache.ts";
import {octetToMo, ONE_KILO_OCTET, ONE_MEGA_OCTET} from "../publicTools.ts";
import {cacheEntryToResponse, readContentLength, responseToCacheEntry} from "../internalTools.ts";

const nFS = NodeSpace.fs;

const clearHotReloadKey = NodeSpace.app.clearHotReloadKey;
const keepOnHotReload = NodeSpace.app.keepOnHotReload;
const HOT_RELOAD_KEY = "jopi.rewrite.inMemoryCache.hotReloadKey";

export interface InMemoryCacheOptions {
    /**
     * The memory cache survives hot-reload.
     * If a hot-reload occurs, the cache contact is kept as-is.
     * This option allows changing this behavior and automatically clearing
     * the memory cache if a hot-reload is detected.
     */
    clearOnHotReload?: boolean;

    /**
     * If an item is larger than this value, then he will not be added to the cache.
     * Default value is 600 ko.
     */
    maxContentLength?: number;

    /**
     * The max number of items in the cache.
     * Default is 5000.
     */
    maxItemCount?: number;

    /**
     * A delta which allows not triggering garbage collector too soon.
     */
    maxItemCountDelta?: number;

    /**
     * The max memory usage (mesure is Mo).
     * Default is 500Mo
     */
    maxMemoryUsage_mo?: number;

    /**
     * A delta which allows not triggering garbage collector too soon.
     */
    maxMemoryUsageDela_mo?: number;
}

interface MyCacheEntry extends CacheEntry {
    ucpBinary?: ArrayBuffer;
    ucpBinarySize?: number;

    gzipBinary?: ArrayBuffer;
    gzipBinarySize?: number;
}

class InMemoryCache implements PageCache {
    createSubCache(name: string): PageCache {
        return new InMemorySubCache(this, name);
    }

    private readonly cache = keepOnHotReload(HOT_RELOAD_KEY, () => new Map<string, MyCacheEntry>());

    private readonly maxContentLength: number;

    private statItemCount = 0;
    private readonly maxItemCount: number;
    private readonly maxItemCountDelta: number;

    private statMemoryUsage = 0;
    private readonly maxMemoryUsage: number;
    private readonly maxMemoryUsageDelta: number;

    constructor(options?: InMemoryCacheOptions) {
        options = options || {};

        if (!options.maxContentLength) options.maxContentLength = ONE_KILO_OCTET * 600;

        if (!options.maxItemCount) options.maxItemCount = 5000;
        if (!options.maxItemCountDelta) options.maxItemCountDelta = Math.trunc(options.maxItemCount * 0.1);

        if (!options.maxMemoryUsage_mo) options.maxMemoryUsage_mo = 500;
        if (!options.maxMemoryUsageDela_mo) options.maxMemoryUsageDela_mo = Math.trunc(options.maxMemoryUsageDela_mo! * 0.1);

        this.maxContentLength = options.maxContentLength!;

        this.maxItemCount = options.maxItemCount!;
        this.maxItemCountDelta = options.maxItemCountDelta!;

        this.maxMemoryUsage = Math.trunc(options.maxMemoryUsage_mo * ONE_MEGA_OCTET);
        this.maxMemoryUsageDelta = Math.trunc(options.maxMemoryUsageDela_mo * ONE_MEGA_OCTET);
    }

    async addToCache(url: URL, response: Response, headersToInclude: string[]|undefined, storeUncompressed: boolean): Promise<Response> {
        return this.key_AddToCache(url.toString(), response, headersToInclude, storeUncompressed);
    }

    removeFromCache(url: URL): Promise<void> {
        return this.key_removeFromCache(url.toString());
    }

    async getFromCache(url: URL, getGzippedVersion: boolean): Promise<Response|undefined> {
        return this.key_getFromCache(url.toString(), getGzippedVersion);
    }

    async hasInCache(url: URL, requireUncompressedVersion?: boolean|undefined): Promise<boolean> {
        const cacheEntry = this.cache.get(url.toString());
        if (!cacheEntry) return false;

        if (requireUncompressedVersion===undefined) {
            return true;
        }

        if (requireUncompressedVersion) return cacheEntry.ucpBinary!==undefined;
        return cacheEntry.gzipBinary!==undefined;
    }

    /**
     * Set the binary value inside the cache entry.
     * This by compressing the binary if needed.
     */
    private async setBinary(cacheEntry: MyCacheEntry, response: Response, storeUncompressed: boolean) {
        // We only store a compressed version.
        // No gzipped version. Why? Probably because the content will be hacked.
        //
        if (storeUncompressed) {
            cacheEntry.ucpBinary = await response.arrayBuffer();
            cacheEntry.ucpBinarySize = cacheEntry.ucpBinary.byteLength;
            return;
        }

        const fileUncompressed = path.resolve(path.join(".", "temp", crypto.randomUUID()));
        const fileGzip = fileUncompressed + ".gzip";
        await mkDirForFile(fileUncompressed);

        await saveReadableStreamToFile(fileUncompressed, response.body as ReadableStream);
        await gzipFile(fileUncompressed, fileGzip);

        const fileGZipSize = await nFS.getFileSize(fileGzip);

        if (fileGZipSize<this.maxContentLength) {
            let bytes = await nFS.readFileToBytes(fileGzip);
            cacheEntry.gzipBinary = bytes.buffer as ArrayBuffer;
            cacheEntry.gzipBinarySize = cacheEntry.gzipBinary.byteLength;
        }

        await nFS.unlink(fileUncompressed);
        await nFS.unlink(fileGzip);
    }

    //region With a key

    async key_AddToCache(key: string, response: Response, headersToInclude: string[]|undefined, storeUncompressed: boolean) {
        const cacheEntry = responseToCacheEntry(response, headersToInclude, !storeUncompressed) as MyCacheEntry;

        if (response.status===200 && response.body) {
            const contentLength = readContentLength(response.headers);

            if (contentLength>this.maxContentLength) {
                console.log("Excluded:", key, "(size: " + octetToMo(contentLength) + "Mo)");
                return response;
            }

            await this.setBinary(cacheEntry, response, storeUncompressed);
            if (cacheEntry.ucpBinary) this.statMemoryUsage += cacheEntry.ucpBinarySize!;
            if (cacheEntry.gzipBinary) this.statMemoryUsage += cacheEntry.gzipBinarySize!;

            if (storeUncompressed) {
                cacheEntry.binary = cacheEntry.ucpBinary;
                cacheEntry.binarySize = cacheEntry.ucpBinarySize;
            } else {
                cacheEntry.binary = cacheEntry.gzipBinary;
                cacheEntry.binarySize = cacheEntry.gzipBinarySize;
            }

            response = cacheEntryToResponse(cacheEntry);
        }

        this.cache.set(key, cacheEntry);

        this.statItemCount++;
        cacheEntry._refCount = 1;
        cacheEntry._refCountSinceGC = 1;

        if (this.needToGC()) {
            this.garbageCollector();
        }

        return response;
    }

    key_removeFromCache(key: string): Promise<void> {
        const cacheEntry = this.cache.get(key);

        if (cacheEntry) {
            this.statItemCount--;

            let size = 0;
            if (cacheEntry.ucpBinarySize) size += cacheEntry.ucpBinarySize;
            if (cacheEntry.gzipBinarySize) size += cacheEntry.gzipBinarySize;
            if (size) this.statMemoryUsage -= size;
        }

        return Promise.resolve();
    }

    key_getFromCache(key: string, getGzippedVersion: boolean): Response|undefined {
        const res = this.key_getValueFromCache(key, getGzippedVersion);

        if (res) {
            return cacheEntryToResponse(res);
        }

        return undefined;
    }

    private key_getValueFromCache(key: string, getGzippedVersion: boolean): CacheEntry|undefined {
        const cacheEntry = this.cache.get(key);
        if (!cacheEntry) return undefined;

        cacheEntry._refCount!++;
        cacheEntry._refCountSinceGC!++;

        if (getGzippedVersion && cacheEntry.gzipBinary) {
            cacheEntry.binary = cacheEntry.gzipBinary;
            cacheEntry.binarySize = cacheEntry.gzipBinarySize;
            cacheEntry.isGzipped = true;
            return cacheEntry;
        }

        if (cacheEntry.ucpBinary) {
            cacheEntry.binary = cacheEntry.ucpBinary;
            cacheEntry.binarySize = cacheEntry.ucpBinarySize;
            cacheEntry.isGzipped = false;
            return cacheEntry;
        }

        cacheEntry.binary = undefined;
        return cacheEntry;
    }

    //endregion

    //region Garbage collector

    private needToGC() {
        if (this.statItemCount>this.maxItemCount) return true;
        else if (this.statMemoryUsage>this.maxMemoryUsage) return true;
        return false;
    }

    private garbageCollector() {
        const removeEntry = (key: string, cacheEntry: MyCacheEntry) => {
            if (key.endsWith(".html")) debugger;

            keyToRemove.push(key);
            this.statItemCount--;

            let size = 0;
            if (cacheEntry.ucpBinarySize) size += cacheEntry.ucpBinarySize;
            if (cacheEntry.gzipBinarySize) size += cacheEntry.gzipBinarySize;

            if (size) {
                this.statMemoryUsage -= size;

                console.log("|->  ... gc has removed " + key + " / size:", octetToMo(size), "mb");
            } else {
                console.log("|->  ... gc has removed " + key);
            }
        }

        const purge = () => {
            for (const key of keyToRemove) {
                this.cache.delete(key);
            }

            keyToRemove.splice(0);
        }

        function isHtml(cacheEntry: MyCacheEntry) {
            if (!cacheEntry.headers) return false;
            if (!cacheEntry.gzipBinary && !cacheEntry.ucpBinary) return false;

            const contentType = cacheEntry.headers["content-type"];
            return contentType.startsWith("text/html");
        }

        const remove_NotUsedSince = (avoidHtml: boolean) => {
            const limit = this.maxItemCount - this.maxItemCountDelta;
            if (this.statItemCount < limit) return;

            for (const [key, cacheEntry] of this.cache.entries()) {
                if (!cacheEntry._refCountSinceGC) {
                    if (avoidHtml && isHtml(cacheEntry)) {
                        // Avoid removing HTML items since they need calculation.
                        continue;
                    }

                    removeEntry(key, cacheEntry);
                    if (this.statItemCount < limit) return;
                }
            }

            purge();
        }

        const remove_WeighterEntries = (avoidHtml: boolean) => {
            const exec = (): boolean => {
                let maxWeight = 0;
                let maxEntry: CacheEntry | undefined;
                let maxKey = "";

                for (const [key, cacheEntry] of this.cache.entries()) {
                    if (avoidHtml && isHtml(cacheEntry)) {
                        // Avoid removing HTML items since they need calculation.
                        continue;
                    }

                    let size = 0;
                    if (cacheEntry.ucpBinarySize) size += cacheEntry.ucpBinarySize;
                    if (cacheEntry.gzipBinarySize) size += cacheEntry.gzipBinarySize;

                    if (size > maxWeight) {
                        maxWeight = size;
                        maxEntry = cacheEntry;
                        maxKey = key;
                    }

                    cacheEntry._refCountSinceGC = 0;
                }

                if (maxEntry) {
                    removeEntry(maxKey, maxEntry);
                    purge();

                    return true;
                }

                return false;
            }

            const limit = this.maxMemoryUsage - this.maxMemoryUsageDelta;

            while (this.statMemoryUsage > limit) {
                if (!exec()) break;
            }
        }

        const keyToRemove: string[] = [];
        const itemCountBefore = this.statItemCount;
        const memoryUsageBefore = this.statMemoryUsage;

        console.log("====== InMemory cache is executing garbage collector ======");

        remove_WeighterEntries(true);
        remove_WeighterEntries(false);

        remove_NotUsedSince(true);
        remove_NotUsedSince(false);

        for (const [_, cacheEntry] of this.cache.entries()) {
            cacheEntry._refCountSinceGC = 0;
        }

        console.log("===========================================================");
        console.log("Item count ----> before:", itemCountBefore + ", after:", this.statItemCount, " [limit: " + this.maxItemCount + " items]");
        console.log("Memory usage --> before:", octetToMo(memoryUsageBefore) + "Mb, after:", octetToMo(this.statMemoryUsage), "mb [limit: " + octetToMo(this.maxMemoryUsage) + "mb]");
        console.log("===========================================================");
        console.log();
    }

    //endregion
}

class InMemorySubCache implements PageCache {
    private readonly prefix: string;

    constructor(private readonly parent: InMemoryCache, name: string) {
        this.prefix = name + " : ";
    }

    async addToCache(url: URL, response: Response, headersToInclude: string[]|undefined, storeUncompressed: boolean): Promise<Response> {
        return this.parent.key_AddToCache(this.prefix + url.toString(), response, headersToInclude, storeUncompressed);
    }

    async hasInCache(url: URL, requireUncompressedVersion?: boolean|undefined): Promise<boolean> {
        return this.parent.hasInCache(url, requireUncompressedVersion);
    }

    removeFromCache(url: URL): Promise<void> {
        return this.parent.key_removeFromCache(this.prefix + url.toString());
    }

    async getFromCache(url: URL, getGzippedVersion: boolean): Promise<Response|undefined> {
        return this.parent.key_getFromCache(this.prefix + url.toString(), getGzippedVersion);
    }

    createSubCache(name: string): PageCache {
        return this.parent.createSubCache(name);
    }
}

export function initMemoryCache(options: InMemoryCacheOptions) {
    if (gInstance) return;

    if (options.clearOnHotReload) {
        clearHotReloadKey(HOT_RELOAD_KEY);
    }

    gInstance = new InMemoryCache(options);
}

export function getInMemoryCache(): PageCache {
    if (!gInstance) initMemoryCache({});
    return gInstance;
}

let gInstance: InMemoryCache;