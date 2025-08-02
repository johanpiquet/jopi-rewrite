import {type CacheEntry, cacheEntryToResponse, PageCache, responseToCacheEntry} from "../core";
import path from "node:path";
import {gzipFile} from "../gzip";
import fs from "node:fs/promises";

export class SimpleFileCache extends PageCache {
    public readonly rootDir: string;
    
    constructor(rootDir: string) {
        super();

        if (!rootDir) rootDir = ".";
        if (!path.isAbsolute(rootDir)) rootDir = path.resolve(process.cwd(), rootDir);
        this.rootDir = rootDir;
    }

    private calKey(url: URL): string {
        // Using a hash allows difficulties with query string special characters.
        return Bun.hash(url.toString()).toString()
    }

    private calcFilePath(url: URL): string {
        const key = this.calKey(url);
        let fp = path.join(this.rootDir, key[0], key);
        if (fp.endsWith("/")) fp += "index.html";
        return fp;
    }

    override async addToCache(url: URL, response: Response, headersToInclude: string[]|undefined, storeUncompressed: boolean, meta: unknown): Promise<Response> {
        // >>> Store the infos.

        await this.saveCacheEntry(url, response, headersToInclude, meta, !storeUncompressed);

        // >>> Store the body.

        // Don't store the body if it's not a 200.
        // If 404 with body: must be handled as a special case by the caller.
        //
        if (response.status!==200) {
            return response;
        }

        const filePath = this.calcFilePath(url);
        await fs.mkdir(path.dirname(filePath), {recursive: true});

        const fileUncompressed = Bun.file(filePath);
        await fileUncompressed.write(response);

        if (!storeUncompressed) {
            await gzipFile(filePath, filePath + " gz");
            await fileUncompressed.delete();
        }

        if (storeUncompressed) {
            const result = new Response(fileUncompressed, {status: response.status, headers: response.headers});
            result.headers.delete("content-encoding");
            return result;
        } else {
            const fileResponse = Bun.file(filePath + " gz");
            const result = new Response(fileResponse, {status: response.status, headers: response.headers});
            result.headers.set("content-encoding", "gzip");
            return result;
        }
    }

    override async removeFromCache(url: URL): Promise<void> {
        const filePath = this.calcFilePath(url);

        await Bun.file(filePath).delete();
        await Bun.file(filePath + " gz").delete();
        await Bun.file(filePath + " info").delete();

        return Promise.resolve();
    }

    override async getFromCache(url: URL, getGzippedVersion: boolean): Promise<Response|undefined> {
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

            const file = Bun.file(filePath);

            if (await file.exists()) {
                if (mustUnzip) {
                    const stream = Bun.gunzipSync(await file.bytes());
                    cacheEntry.binary = stream;
                    cacheEntry.binarySize = stream.length;
                } else {
                    cacheEntry.binary = file;
                    cacheEntry.binarySize = file.size;
                }
            }
        }

        return cacheEntryToResponse(cacheEntry);
    }

    override async hasInCache(url: URL, requireUncompressedVersion?: boolean|undefined): Promise<boolean> {
        const cacheEntry = await this.getCacheEntry(url);
        if (!cacheEntry) return false;

        if (requireUncompressedVersion===undefined) return true;
        if (requireUncompressedVersion) return cacheEntry.isGzipped===false;
        return cacheEntry.isGzipped===true;
    }

    override async getMeta<T>(url: URL): Promise<T|undefined> {
        const infos = await this.getCacheEntry(url);
        if (!infos) return undefined;
        return infos.meta as T|undefined;
    }

    private async getCacheEntry(url: URL): Promise<CacheEntry|undefined> {
        const filePath = this.calcFilePath(url);

        try {
            return await new Response(Bun.file(filePath + " info")).json();
        }
        catch {
            // We are here if the file doesn't exist.
            return undefined;
        }
    }

    private async saveCacheEntry(url: URL, response: Response, headersToInclude: string[]|undefined, meta: any, isGzipped: boolean) {
        const cacheEntry = responseToCacheEntry(response, headersToInclude, meta, isGzipped);

        const filePath = this.calcFilePath(url) + " info";
        await fs.mkdir(path.dirname(filePath), {recursive: true});
        await Bun.file(filePath).write(JSON.stringify(cacheEntry));
    }

    createSubCache(name: string): PageCache {
        const newDir = path.join(this.rootDir, "_ subCaches", name);
        return new SimpleFileCache(newDir);
    }
}