import { type MetaUpdater, type PageCache } from "../core.tsx";
export declare class SimpleFileCache implements PageCache {
    readonly rootDir: string;
    constructor(rootDir: string);
    private calKey;
    private calcFilePath;
    addToCache(url: URL, response: Response, headersToInclude: string[] | undefined, storeUncompressed: boolean, metaUpdater: MetaUpdater<unknown>): Promise<Response>;
    removeFromCache(url: URL): Promise<void>;
    getFromCache(url: URL, getGzippedVersion: boolean, metaUpdater?: MetaUpdater<unknown>): Promise<Response | undefined>;
    hasInCache(url: URL, requireUncompressedVersion?: boolean | undefined): Promise<boolean>;
    getMeta<T>(url: URL): Promise<T | undefined>;
    private getCacheEntry;
    private saveNewCacheEntry;
    private saveCacheEntry;
    createSubCache(name: string): PageCache;
}
