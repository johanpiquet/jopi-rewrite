import path from "node:path";
import "jopi-node-space";
import fs from "node:fs/promises";
import type {MetaUpdater} from "./metaUpdater.js";

const nFS = NodeSpace.fs;

export interface CacheRole {
    isUserCache?: boolean;
    isMobileCache?: boolean;
}

export interface PageCache {
    cacheRole?: CacheRole;

    getFromCache(url: URL, getGzippedVersion: boolean, metaUpdater?: MetaUpdater<unknown>): Promise<Response | undefined>;

    addToCache(url: URL, response: Response, headersToInclude: string[] | undefined, storeUncompressed: boolean, metaUpdater?: MetaUpdater<unknown>): Promise<Response>;

    hasInCache(url: URL, requireUncompressedVersion?: boolean | undefined): Promise<boolean>;

    removeFromCache(url: URL): Promise<void>;

    getMeta<T>(url: URL): Promise<T | undefined>;

    createSubCache(name: string): PageCache;
}

export class WebSiteMirrorCache implements PageCache {
    public readonly rootDir: string;
    public readonly rootDirAtFileUrl: string;

    constructor(rootDir: string) {
        if (!rootDir) rootDir = ".";
        if (!path.isAbsolute(rootDir)) rootDir = path.resolve(process.cwd(), rootDir);
        this.rootDir = rootDir;
        this.rootDirAtFileUrl = nFS.pathToFileURL(this.rootDir).href;
    }

    private calKey(url: URL): string {
        let sURL = this.rootDirAtFileUrl + url.pathname;
        return nFS.fileURLToPath(sURL);
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
            await nFS.writeResponseToFile(new Response(bodySaveFile), filePath);

            const headers: any = {
                "content-type": nFS.getMimeTypeFromName(filePath),
                "content-length": await nFS.getFileSize(filePath)
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
        const stats = await nFS.getFileStat(filePath);
        return !!stats && stats.isFile();
    }

    async getFromCache(url: URL): Promise<Response|undefined> {
        const filePath = this.calcFilePath(url);
        const stats = await nFS.getFileStat(filePath);

        if (stats && stats.isFile()) {
            let contentType = nFS.getMimeTypeFromName(filePath);
            const contentLength = stats.size;

            const headers: any = {
                "content-type": contentType,
                "content-length": contentLength.toString()
            };

            return nFS.createResponseFromFile(filePath, 200, headers);
        }

        return undefined;
    }

    async getMeta<T>(url: URL): Promise<T|undefined> {
        const filePath = this.calcFilePath(url);

        try {
            const text = await nFS.readTextFromFile(filePath + " meta");
            return JSON.parse(text) as T;
        }
        catch {
            // We are here if the meta doesn't exist.
            return Promise.resolve(undefined);
        }
    }

    createSubCache(name: string): PageCache {
        const newDir = path.join(this.rootDir, "_ subCaches", name);
        return new WebSiteMirrorCache(newDir);
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

    getMeta<T>(_url: URL): Promise<T | undefined> {
        return Promise.resolve(undefined);
    }

    createSubCache(): PageCache {
        return this;
    }
}

export interface CacheEntry {
    binary?: ArrayBuffer;
    binarySize?: number;
    isGzipped?: boolean;

    headers?: {[key:string]: string};

    meta?: any;
    status?: number;

    _refCount?: number;
    _refCountSinceGC?: number;
}