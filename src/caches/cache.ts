import path from "node:path";
import * as ns_fs from "jopi-node-space/ns_fs";
import fs from "node:fs/promises";
import {makeIterable} from "../internalTools.js";

export interface CacheRole {
    isUserCache?: boolean;
    isMobileCache?: boolean;
}

export interface PageCache {
    cacheRole?: CacheRole;

    getFromCache(url: URL, getGzippedVersion: boolean): Promise<Response | undefined>;

    addToCache(url: URL, response: Response, headersToInclude: string[] | undefined, storeUncompressed: boolean): Promise<Response>;

    hasInCache(url: URL, requireUncompressedVersion?: boolean | undefined): Promise<boolean>;

    removeFromCache(url: URL): Promise<void>;

    createSubCache(name: string): PageCache;

    getSubCacheIterator(): Iterable<string>;

    getCacheEntryIterator(subCacheName?: string): Iterable<CacheEntry>;
}

export class WebSiteMirrorCache implements PageCache {
    public readonly rootDir: string;
    public readonly rootDirAtFileUrl: string;

    constructor(rootDir: string) {
        if (!rootDir) rootDir = ".";
        if (!path.isAbsolute(rootDir)) rootDir = path.resolve(process.cwd(), rootDir);
        this.rootDir = rootDir;
        this.rootDirAtFileUrl = ns_fs.pathToFileURL(this.rootDir).href;
    }

    private calKey(url: URL): string {
        let sURL = this.rootDirAtFileUrl + url.pathname;
        return ns_fs.fileURLToPath(sURL);
    }

    private calcFilePath(url: URL): string {
        let fp = this.calKey(url);

        if (fp.endsWith("/")) {
            fp += "index.html";
        } else {
            const ext = path.extname(fp);
            if (!ext) fp += "/index.html";
        }

        return fp;
    }

    async addToCache(url: URL, response: Response): Promise<Response> {
        // We don't store 404 and others.
        if (response.status !== 200) return response;

        const filePath = this.calcFilePath(url);
        await fs.mkdir(path.dirname(filePath), {recursive: true});

        try {
            if (!response.body) return response;

            const [bodyRes, bodySaveFile] = response.body.tee();
            await ns_fs.writeResponseToFile(new Response(bodySaveFile), filePath);

            const headers: any = {
                "content-type": ns_fs.getMimeTypeFromName(filePath),
                "content-length": await ns_fs.getFileSize(filePath)
            };

            return new Response(bodyRes, {status: 200, headers});
        }
        catch (e) {
            console.error(e);
            return new Response("", {status: 500});
        }
    }

    async removeFromCache(url: URL): Promise<void> {
        const filePath = this.calcFilePath(url);
        await fs.unlink(filePath);
    }

    async hasInCache(url: URL): Promise<boolean> {
        const filePath = this.calcFilePath(url);
        const stats = await ns_fs.getFileStat(filePath);
        return !!stats && stats.isFile();
    }

    async getFromCache(url: URL): Promise<Response|undefined> {
        const filePath = this.calcFilePath(url);
        const stats = await ns_fs.getFileStat(filePath);

        if (stats && stats.isFile()) {
            let contentType = ns_fs.getMimeTypeFromName(filePath);
            const contentLength = stats.size;

            const headers: any = {
                "content-type": contentType,
                "content-length": contentLength.toString()
            };

            return ns_fs.createResponseFromFile(filePath, 200, headers);
        }

        return undefined;
    }

    createSubCache(name: string): PageCache {
        const newDir = path.join(this.rootDir, "_ subCaches", name);
        return new WebSiteMirrorCache(newDir);
    }

    getCacheEntryIterator() {
        return makeIterable({
            next(): IteratorResult<CacheEntry> {
                return { value: undefined, done: true };
            }
        });
    }

    getSubCacheIterator() {
        return makeIterable({
            next(): IteratorResult<string> {
                return { value: undefined, done: true };
            }
        });
    }
}

export class VoidPageCache implements PageCache {
    getFromCache(): Promise<Response | undefined> {
        return Promise.resolve(undefined);
    }

    addToCache(_url: URL, response: Response): Promise<Response> {
        return Promise.resolve(response);
    }

    hasInCache(): Promise<boolean> {
        return Promise.resolve(false);
    }

    removeFromCache(_url: URL): Promise<void> {
        return Promise.resolve();
    }

    createSubCache(): PageCache {
        return this;
    }

    getCacheEntryIterator() {
        return makeIterable({
            next(): IteratorResult<CacheEntry> {
                return { value: undefined, done: true };
            }
        });
    }

    getSubCacheIterator() {
        return makeIterable({
            next(): IteratorResult<string> {
                return { value: undefined, done: true };
            }
        });
    }
}

export interface CacheEntry {
    url: string;
    binary?: ArrayBuffer;
    binarySize?: number;
    isGzipped?: boolean;

    headers?: {[key:string]: string};

    status?: number;

    _refCount?: number;
    _refCountSinceGC?: number;
}