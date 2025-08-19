import { type PageCache } from "../core.tsx";
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
     * A delta allows not triggering garbage collector too soon.
     */
    maxItemCountDelta?: number;
    /**
     * The max memory usage (mesure is Mo).
     * Default is 500Mo
     */
    maxMemoryUsage_mo?: number;
    /**
     * A delta allows not triggering garbage collector too soon.
     */
    maxMemoryUsageDela_mo?: number;
}
export declare function initMemoryCache(options: InMemoryCacheOptions): void;
export declare function getInMemoryCache(): PageCache;
