import * as jk_timer from "jopi-toolkit/jk_timer";
export var serverInitChronos = jk_timer.chrono(false);
export function parseCookies(headers) {
    var cookies = {};
    var cookieHeader = headers.get('Cookie');
    if (!cookieHeader) {
        return cookies;
    }
    cookieHeader.split(';').forEach(function (cookie) {
        var parts = cookie.split('=');
        if (parts.length >= 2) {
            var name_1 = parts[0].trim();
            cookies[name_1] = parts.slice(1).join('=').trim();
        }
    });
    return cookies;
}
export function readContentLength(headers) {
    var cl = headers.get("content-length");
    if (!cl)
        return -1;
    return parseInt(cl);
}
export function cacheEntryToResponse(entry) {
    if (entry.binary) {
        var headers = entry.headers;
        if (!headers)
            headers = {};
        if (entry.isGzipped) {
            headers["content-encoding"] = "gzip";
        }
        else {
            delete (headers["content-encoding"]);
        }
        return new Response(entry.binary, {
            status: entry.status || 200,
            headers: headers
        });
    }
    return new Response("", { status: entry.status, headers: entry.headers });
}
var gDefaultHeadersToCache = ["content-type", "etag", "last-modified"];
export function responseToCacheEntry(url, response, headersToInclude, isGzipped) {
    var status = response.status;
    var entry = { isGzipped: isGzipped, status: status, url: url };
    if (status === 200) {
        var headers_1 = {};
        entry.headers = headers_1;
        // "content-type", "etag", "last-modified"
        if (!headersToInclude)
            headersToInclude = gDefaultHeadersToCache;
        headersToInclude.forEach(function (header) { return addHeaderIfExist(headers_1, header, response.headers); });
    }
    if ((status >= 300) && (status < 400)) {
        entry.headers = {};
        addHeaderIfExist(entry.headers, "Location", response.headers);
    }
    return entry;
}
export function addHeaderIfExist(headers, headerName, source) {
    var v = source.get(headerName);
    if (v !== null)
        headers[headerName] = v;
}
export function makeIterable(iterator) {
    var _a;
    return _a = {},
        _a[Symbol.iterator] = function () {
            return iterator;
        },
        _a;
}
