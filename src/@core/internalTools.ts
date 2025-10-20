import type {CacheEntry} from "./caches/cache.ts";
import * as ns_timer from "jopi-toolkit/ns_timer";

export const serverInitChronos = ns_timer.chrono(false);

export function parseCookies(headers: Headers): { [name: string]: string } {
    const cookies: { [name: string]: string } = {};
    const cookieHeader = headers.get('Cookie');

    if (!cookieHeader) {
        return cookies;
    }

    cookieHeader.split(';').forEach(cookie => {
        const parts = cookie.split('=');
        if (parts.length >= 2) {
            const name = parts[0].trim();
            cookies[name] = parts.slice(1).join('=').trim();
        }
    });

    return cookies;
}

export function readContentLength(headers: Headers): number {
    const cl = headers.get("content-length");
    if (!cl) return -1;
    return parseInt(cl);
}

export function cacheEntryToResponse(entry: CacheEntry) {
    if (entry.binary) {
        let headers = entry.headers;
        if (!headers) headers = {};

        if (entry.isGzipped) {
            headers["content-encoding"] = "gzip";
        }
        else {
            delete(headers["content-encoding"]);
        }

        return new Response(entry.binary, {
            status: entry.status||200,
            headers: headers
        });
    }

    return new Response("", {status: entry.status, headers: entry.headers});
}

const gDefaultHeadersToCache: string[] = [ "content-type", "etag", "last-modified"];

export function responseToCacheEntry(url: string, response: Response, headersToInclude: string[]|undefined, isGzipped: boolean): CacheEntry {
    const status = response.status;
    const entry: CacheEntry = {isGzipped, status, url};

    if (status===200) {
        const headers = {};
        entry.headers = headers;

        // "content-type", "etag", "last-modified"
        if (!headersToInclude) headersToInclude = gDefaultHeadersToCache;

        headersToInclude.forEach(header => addHeaderIfExist(headers, header, response.headers));
    }

    if ((status>=300)&&(status<400)) {
        entry.headers = {};
        addHeaderIfExist(entry.headers!, "Location", response.headers);
    }

    return entry;
}

export function addHeaderIfExist(headers: {[key: string]: string}, headerName: string, source: Headers) {
    const v = source.get(headerName);
    if (v!==null) headers[headerName] = v;
}

export function makeIterable<T>(iterator: Iterator<T>): Iterable<T> {
    return {
        [Symbol.iterator]() {
            return iterator;
        }
    };
}