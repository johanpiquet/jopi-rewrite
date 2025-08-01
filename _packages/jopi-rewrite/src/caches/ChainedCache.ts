import {PageCache, WebSite} from "../core";

/**
 * A cache where:
 * - Values are get from 'mainCache'. If not found, search inside the 'secondCache'.
 * - Values are added to 'mainCache' and 'secondCache'.
 * - Values are deleted from 'mainCache' and 'secondCache'.
 */
export default class ChainedCache extends PageCache {
    /**
     * @param mainCache
     *      The main cache to search.
     * @param secondCache
     *      Search in the second cache if not found with the main one.
     * @param autoAddToFirstCache
     *      If true, then values found in the second cache
     *      are automatically added to the main cache.
     */
    constructor(private mainCache: PageCache, private secondCache: PageCache, private autoAddToFirstCache: boolean) {
        super();
    }

    async getFromCache(url: URL, webSite: WebSite, getGzippedVersion: boolean): Promise<Response|undefined> {
        let res = await this.mainCache.getFromCache(url, webSite, getGzippedVersion);

        if (!res) {
            res = await this.secondCache.getFromCache(url, webSite, getGzippedVersion);

            if (res && this.autoAddToFirstCache) {
                const meta = await this.secondCache.getMeta(url, webSite);
                const isCompressed = res.headers.get("content-encoding") === "gzip";
                await this.mainCache.addToCache(url, res, webSite, isCompressed, meta);
            }
        }

        return res;
    }

    async addToCache(url: URL, response: Response, webSite: WebSite, storeUncompressed: boolean, meta: unknown): Promise<Response> {
        response = await this.mainCache.addToCache(url, response, webSite, storeUncompressed, meta);
        response = await this.secondCache.addToCache(url, response, webSite, storeUncompressed, meta);
        return response;
    }

    async removeFromCache(url: URL): Promise<void> {
        await this.mainCache.removeFromCache(url);
        await this.secondCache.removeFromCache(url);
    }

    /**
     * Returns the metadata for the cache entry.
     */
    async getMeta<T>(url: URL, webSite: WebSite): Promise<T|undefined> {
        let meta = await this.mainCache.getMeta(url, webSite) as T|undefined;

        // A meta can be stored, even if we haven't a resource store for this url.
        // It's why we must also check the second cache.
        //
        if (!meta) {
            meta = await this.secondCache.getMeta(url, webSite) as T|undefined;

            if (meta && this.autoAddToFirstCache) {
                const res = await this.secondCache.getFromCache(url, webSite, false);
                await this.mainCache.addToCache(url, res!, webSite, false, meta);
            }
        }

        return meta;
    }

    createSubCache(name: string): PageCache {
        const mainSubCache = this.mainCache.createSubCache(name);
        const secondSubCache = this.secondCache.createSubCache(name);
        return new ChainedCache(mainSubCache, secondSubCache, this.autoAddToFirstCache);
    }
}