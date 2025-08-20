import { cacheEntryToResponse, MetaUpdaterResult, octetToMo, ONE_KILO_OCTET, ONE_MEGA_OCTET, readContentLength, responseToCacheEntry } from "../core.js";
import { gzipFile, mkDirForFile, saveReadableStreamToFile } from "../gzip.js";
import * as path from "node:path";
const nFS = NodeSpace.fs;
const clearHotReloadKey = NodeSpace.app.clearHotReloadKey;
const keepOnHotReload = NodeSpace.app.keepOnHotReload;
const HOT_RELOAD_KEY = "jopi.rewrite.inMemoryCache.hotReloadKey";
class InMemoryCache {
    createSubCache(name) {
        return new InMemorySubCache(this, name);
    }
    cache = keepOnHotReload(HOT_RELOAD_KEY, () => new Map());
    maxContentLength;
    statItemCount = 0;
    maxItemCount;
    maxItemCountDelta;
    statMemoryUsage = 0;
    maxMemoryUsage;
    maxMemoryUsageDelta;
    constructor(options) {
        options = options || {};
        if (!options.maxContentLength)
            options.maxContentLength = ONE_KILO_OCTET * 600;
        if (!options.maxItemCount)
            options.maxItemCount = 5000;
        if (!options.maxItemCountDelta)
            options.maxItemCountDelta = Math.trunc(options.maxItemCount * 0.1);
        if (!options.maxMemoryUsage_mo)
            options.maxMemoryUsage_mo = 500;
        if (!options.maxMemoryUsageDela_mo)
            options.maxMemoryUsageDela_mo = Math.trunc(options.maxMemoryUsageDela_mo * 0.1);
        this.maxContentLength = options.maxContentLength;
        this.maxItemCount = options.maxItemCount;
        this.maxItemCountDelta = options.maxItemCountDelta;
        this.maxMemoryUsage = Math.trunc(options.maxMemoryUsage_mo * ONE_MEGA_OCTET);
        this.maxMemoryUsageDelta = Math.trunc(options.maxMemoryUsageDela_mo * ONE_MEGA_OCTET);
    }
    async addToCache(url, response, headersToInclude, storeUncompressed, metaUpdater) {
        return this.key_AddToCache(url.toString(), response, headersToInclude, storeUncompressed, metaUpdater);
    }
    removeFromCache(url) {
        return this.key_removeFromCache(url.toString());
    }
    async getFromCache(url, getGzippedVersion, updater) {
        return this.key_getFromCache(url.toString(), getGzippedVersion, updater);
    }
    async hasInCache(url, requireUncompressedVersion) {
        const cacheEntry = this.cache.get(url.toString());
        if (!cacheEntry)
            return false;
        if (requireUncompressedVersion === undefined) {
            return true;
        }
        if (requireUncompressedVersion)
            return cacheEntry.ucpBinary !== undefined;
        return cacheEntry.gzipBinary !== undefined;
    }
    getMeta(url) {
        return Promise.resolve(this.key_getMeta(url.toString()));
    }
    async setBinary(cacheEntry, response, storeUncompressed) {
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
        await saveReadableStreamToFile(fileUncompressed, response.body);
        await gzipFile(fileUncompressed, fileGzip);
        const fileGZipSize = await nFS.getFileSize(fileGzip);
        if (fileGZipSize < this.maxContentLength) {
            let bytes = await nFS.readFileToBytes(fileGzip);
            cacheEntry.gzipBinary = bytes.buffer;
            cacheEntry.gzipBinarySize = cacheEntry.gzipBinary.byteLength;
        }
        await nFS.unlink(fileUncompressed);
        await nFS.unlink(fileGzip);
    }
    //region With a key
    async key_AddToCache(key, response, headersToInclude, storeUncompressed, metaUpdater) {
        let meta;
        if (metaUpdater) {
            if (metaUpdater.requireCurrentMeta)
                meta = this.key_getMeta(key);
            if (!meta)
                meta = {};
            const mur = metaUpdater.updateMeta(meta, metaUpdater.data);
            if (mur === MetaUpdaterResult.MUST_DELETE)
                meta = undefined;
            else if (mur === MetaUpdaterResult.IS_NOT_UPDATED)
                meta = undefined;
        }
        const cacheEntry = responseToCacheEntry(response, headersToInclude, meta, !storeUncompressed);
        if (response.status === 200 && response.body) {
            const contentLength = readContentLength(response.headers);
            if (contentLength > this.maxContentLength) {
                console.log("Excluded:", key, "(size: " + octetToMo(contentLength) + "Mo)");
                return response;
            }
            await this.setBinary(cacheEntry, response, storeUncompressed);
            if (cacheEntry.ucpBinary)
                this.statMemoryUsage += cacheEntry.ucpBinarySize;
            if (cacheEntry.gzipBinary)
                this.statMemoryUsage += cacheEntry.gzipBinarySize;
            if (storeUncompressed) {
                cacheEntry.binary = cacheEntry.ucpBinary;
                cacheEntry.binarySize = cacheEntry.ucpBinarySize;
            }
            else {
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
    key_removeFromCache(key) {
        const cacheEntry = this.cache.get(key);
        if (cacheEntry) {
            this.statItemCount--;
            let size = 0;
            if (cacheEntry.ucpBinarySize)
                size += cacheEntry.ucpBinarySize;
            if (cacheEntry.gzipBinarySize)
                size += cacheEntry.gzipBinarySize;
            if (size)
                this.statMemoryUsage -= size;
        }
        return Promise.resolve();
    }
    key_getFromCache(key, getGzippedVersion, updater) {
        const res = this.key_getValueFromCache(key, getGzippedVersion);
        if (res) {
            if (updater) {
                const meta = res.meta || {};
                const updateResult = updater.updateMeta(meta, updater.data);
                switch (updateResult) {
                    case MetaUpdaterResult.MUST_DELETE:
                        res.meta = undefined;
                        break;
                    case MetaUpdaterResult.IS_UPDATED:
                        res.meta = meta;
                        break;
                }
            }
            return cacheEntryToResponse(res);
        }
        return undefined;
    }
    key_getMeta(key) {
        const cacheEntry = this.cache.get(key);
        if (!cacheEntry)
            return undefined;
        return cacheEntry.meta;
    }
    key_getValueFromCache(key, getGzippedVersion) {
        const cacheEntry = this.cache.get(key);
        if (!cacheEntry)
            return undefined;
        cacheEntry._refCount++;
        cacheEntry._refCountSinceGC++;
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
    needToGC() {
        if (this.statItemCount > this.maxItemCount)
            return true;
        else if (this.statMemoryUsage > this.maxMemoryUsage)
            return true;
        return false;
    }
    garbageCollector() {
        const removeEntry = (key, cacheEntry) => {
            if (key.endsWith(".html"))
                debugger;
            keyToRemove.push(key);
            this.statItemCount--;
            let size = 0;
            if (cacheEntry.ucpBinarySize)
                size += cacheEntry.ucpBinarySize;
            if (cacheEntry.gzipBinarySize)
                size += cacheEntry.gzipBinarySize;
            if (size) {
                this.statMemoryUsage -= size;
                console.log("|->  ... gc has removed " + key + " / size:", octetToMo(size), "mb");
            }
            else {
                console.log("|->  ... gc has removed " + key);
            }
        };
        const purge = () => {
            for (const key of keyToRemove) {
                this.cache.delete(key);
            }
            keyToRemove.splice(0);
        };
        function isHtml(cacheEntry) {
            if (!cacheEntry.headers)
                return false;
            if (!cacheEntry.gzipBinary && !cacheEntry.ucpBinary)
                return false;
            const contentType = cacheEntry.headers["content-type"];
            return contentType.startsWith("text/html");
        }
        const remove_NotUsedSince = (avoidHtml) => {
            const limit = this.maxItemCount - this.maxItemCountDelta;
            if (this.statItemCount < limit)
                return;
            for (const [key, cacheEntry] of this.cache.entries()) {
                if (!cacheEntry._refCountSinceGC) {
                    if (avoidHtml && isHtml(cacheEntry)) {
                        // Avoid removing HTML items since they need calculation.
                        continue;
                    }
                    removeEntry(key, cacheEntry);
                    if (this.statItemCount < limit)
                        return;
                }
            }
            purge();
        };
        const remove_WeighterEntries = (avoidHtml) => {
            const exec = () => {
                let maxWeight = 0;
                let maxEntry;
                let maxKey = "";
                for (const [key, cacheEntry] of this.cache.entries()) {
                    if (avoidHtml && isHtml(cacheEntry)) {
                        // Avoid removing HTML items since they need calculation.
                        continue;
                    }
                    let size = 0;
                    if (cacheEntry.ucpBinarySize)
                        size += cacheEntry.ucpBinarySize;
                    if (cacheEntry.gzipBinarySize)
                        size += cacheEntry.gzipBinarySize;
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
            };
            const limit = this.maxMemoryUsage - this.maxMemoryUsageDelta;
            while (this.statMemoryUsage > limit) {
                if (!exec())
                    break;
            }
        };
        const keyToRemove = [];
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
}
class InMemorySubCache {
    parent;
    prefix;
    constructor(parent, name) {
        this.parent = parent;
        this.prefix = name + " : ";
    }
    async addToCache(url, response, headersToInclude, storeUncompressed, metaUpdater) {
        return this.parent.key_AddToCache(this.prefix + url.toString(), response, headersToInclude, storeUncompressed, metaUpdater);
    }
    async hasInCache(url, requireUncompressedVersion) {
        return this.parent.hasInCache(url, requireUncompressedVersion);
    }
    removeFromCache(url) {
        return this.parent.key_removeFromCache(this.prefix + url.toString());
    }
    async getFromCache(url, getGzippedVersion, updater) {
        return this.parent.key_getFromCache(this.prefix + url.toString(), getGzippedVersion, updater);
    }
    getMeta(url) {
        return Promise.resolve(this.parent.key_getMeta(this.prefix + url.toString()));
    }
    createSubCache(name) {
        return this.parent.createSubCache(name);
    }
}
export function initMemoryCache(options) {
    if (gInstance)
        return;
    if (options.clearOnHotReload) {
        clearHotReloadKey(HOT_RELOAD_KEY);
    }
    gInstance = new InMemoryCache(options);
}
export function getInMemoryCache() {
    if (!gInstance)
        initMemoryCache({});
    return gInstance;
}
let gInstance;
//# sourceMappingURL=InMemoryCache.js.map