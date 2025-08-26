import { jsx as _jsx } from "react/jsx-runtime";
// noinspection JSUnusedGlobalSymbols
import * as path from "node:path";
import fs from "node:fs/promises";
import { addRoute, createRouter, findRoute } from "rou3";
import * as jwt from 'jsonwebtoken';
import * as cheerio from "cheerio";
import React, {} from "react";
import * as ReactServer from 'react-dom/server';
import { Page, PageController } from "jopi-rewrite-ui";
import { ServerFetch } from "./serverFetch.js";
import { createBundle, getBundleUrl, handleBundleRequest, hasHydrateComponents, hasExternalCssBundled } from "./hydrate.js";
import { LoadBalancer } from "./loadBalancing.js";
// noinspection ES6PreferShortImport
import { PostMiddlewares } from "./middlewares/index.js";
import serverImpl, {} from "./server.js";
import { declareServerReady, getBrowserRefreshHtmlSnippet, isBrowserRefreshEnabled, mustWaitServerReady } from "@jopi-loader/client";
import { findExecutable } from "@jopi-loader/tools/dist/tools.js";
const nFS = NodeSpace.fs;
const nOS = NodeSpace.os;
const nSocket = NodeSpace.webSocket;
const ONE_DAY = NodeSpace.timer.ONE_DAY;
//region JopiRequest
export class JopiRequest {
    webSite;
    urlInfos;
    coreRequest;
    coreServer;
    route;
    cache;
    mainCache;
    cookies;
    _headers;
    constructor(webSite, urlInfos, coreRequest, coreServer, route) {
        this.webSite = webSite;
        this.urlInfos = urlInfos;
        this.coreRequest = coreRequest;
        this.coreServer = coreServer;
        this.route = route;
        this.cache = webSite.mainCache;
        this.mainCache = this.cache;
        this._headers = this.coreRequest.headers;
    }
    //region Properties
    _customData;
    get customData() {
        if (!this._customData)
            this._customData = {};
        return this._customData;
    }
    /**
     * Return the verb used for the request (GET, POST, PUT, DELETE, ...)
     */
    get method() {
        return this.coreRequest.method;
    }
    /**
     * Return the content type of the request.
     */
    get reqContentType() {
        return this.coreRequest.headers.get("content-type");
    }
    get url() {
        return this.coreRequest.url;
    }
    get body() {
        return this.coreRequest.body;
    }
    get headers() {
        return this._headers;
    }
    set headers(value) {
        this._headers = value;
    }
    /**
     * The part of the url.
     * if : https://mywebsite/product-name/list
     * and route http://mywebsite/{productName}/list
     * then urlParts contains {productName: "product-name"}
     */
    urlParts;
    /**
     * Returns the url search params.
     * For "https://my-site/?sort=asc&filter=jopi", it returns {sort: "asc", filter: "jopi"}.
     */
    get urlSearchParams() {
        const sp = this.urlInfos.searchParams;
        if (!sp.size)
            return {};
        const res = {};
        sp.forEach((value, key) => res[key] = value);
        return res;
    }
    /**
     * Returns information on the caller IP.
     */
    get requestIP() {
        return this.coreServer.requestIP(this.coreRequest);
    }
    get isFromLocalhost() {
        const ip = this.requestIP;
        if (!ip)
            return false;
        const address = ip.address;
        switch (address) {
            case "::1":
            case "127.0.0.1":
            case "::ffff:127.0.0.1":
                return true;
        }
        return false;
    }
    //endregion
    //region Body transforming
    /**
     * Returns all the data about the request.
     * It's concat all data source.
     * - The url parts.
     * - The search param (query string).
     * - The POST/PUT data if available.
     */
    async getReqData(ignoreUrl = false) {
        let res = {};
        if (!ignoreUrl) {
            const searchParams = this.urlInfos.searchParams;
            if (searchParams.size) {
                searchParams.forEach((value, key) => res[key] = value);
            }
            if (this.urlParts) {
                res = { ...res, ...this.urlParts };
            }
        }
        if (this.isReqBodyJson) {
            try {
                const asJson = await this.reqBodyAsJson();
                if (asJson)
                    res = { ...res, ...asJson };
            }
            catch {
                // If JSON is invalid.
            }
        }
        else if (this.isReqBodyXFormUrlEncoded) {
            try {
                let data = await this.reqBodyAsText();
                new URLSearchParams(data).forEach((value, key) => res[key] = value);
            }
            catch {
                // If invalid.
            }
        }
        else if (this.isReqBodyFormData) {
            try {
                const asFormData = await this.reqBodyAsFormData();
                asFormData.forEach((value, key) => res[key] = value);
            }
            catch {
                // If FormData is invalid.
            }
        }
        return res;
    }
    /**
     * Returns all the data about the request, organized by category.
     */
    async getReqDataInfos() {
        let res = {};
        const searchParams = this.urlInfos.searchParams;
        if (searchParams.size) {
            const t = res.searchParams = {};
            searchParams.forEach((value, key) => t[key] = value);
        }
        if (this.urlParts) {
            res.urlParts = { ...this.urlParts };
        }
        if (this.isReqBodyJson) {
            try {
                res.body = await this.reqBodyAsJson();
            }
            catch {
                // If JSON is invalid.
            }
        }
        else if (this.isReqBodyFormData) {
            try {
                const t = res.formData = {};
                const asFormData = await this.reqBodyAsFormData();
                asFormData.forEach((value, key) => t[key] = value);
            }
            catch {
                // If FormData is invalid.
            }
        }
        else if (this.isReqBodyXFormUrlEncoded) {
            try {
                let data = await this.reqBodyAsText();
                const t = res.formUrlEncoded = {};
                new URLSearchParams(data).forEach((value, key) => t[key] = value);
            }
            catch {
                // If invalid.
            }
        }
        return res;
    }
    /**
     * https://developer.mozilla.org/en-US/docs/Web/API/Request/bodyUsed
     */
    get isReqBodyUsed() {
        return this.coreRequest.bodyUsed;
    }
    get isReqBodyJson() {
        const ct = this.reqContentType;
        if (ct === null)
            return false;
        return ct.startsWith("application/json");
    }
    get isReqBodyFormData() {
        const ct = this.reqContentType;
        if (ct === null)
            return false;
        return ct.startsWith("multipart/form-data");
    }
    get isReqBodyXFormUrlEncoded() {
        const ct = this.reqContentType;
        if (ct === null)
            return false;
        return ct.startsWith("application/x-www-form-urlencoded");
    }
    /**
     * https://developer.mozilla.org/en-US/docs/Web/API/Request/text
     */
    reqBodyAsText() {
        return this.coreRequest.text();
    }
    /**
     * https://developer.mozilla.org/en-US/docs/Web/API/Request/json
     */
    reqBodyAsJson() {
        return this.coreRequest.json();
    }
    /**
     * https://developer.mozilla.org/en-US/docs/Web/API/Request/arrayBuffer
     */
    reqBodyAsArrayBuffer() {
        return this.coreRequest.arrayBuffer();
    }
    /**
     * https://developer.mozilla.org/en-US/docs/Web/API/Request/blob
     */
    reqBodyAsBlob() {
        return this.coreRequest.blob();
    }
    /**
     * https://developer.mozilla.org/en-US/docs/Web/API/Request/bytes
     */
    reqBodyAsBytes() {
        return this.coreRequest.bytes();
    }
    /**
     * https://developer.mozilla.org/en-US/docs/Web/API/Request/formData
     */
    reqBodyAsFormData() {
        return this.coreRequest.formData();
    }
    //endregion
    //region Request timeout
    /**
     * When DDOS protection is enabled, the request has a timeout of 60 seconds.
     * Here it'd allow you to extend this time for a request you knew was slow.
     */
    extendTimeout_sec(sec) {
        this.coreServer.timeout(this.coreRequest, sec);
    }
    //endregion
    //region Response helpers
    redirectResponse(permanent = false, url) {
        if (!url)
            url = this.urlInfos;
        return new Response(null, { status: permanent ? 301 : 302, headers: { "location": url.toString() } });
    }
    textResponse(text, statusCode = 200) {
        return new Response(text, { status: statusCode, headers: { "content-type": "text/plain;charset=utf-8" } });
    }
    htmlResponse(html, statusCode = 200) {
        html = this.postProcessHtml(html);
        return new Response(html, { status: statusCode, headers: { "content-type": "text/html;charset=utf-8" } });
    }
    jsonResponse(json, statusCode = 200) {
        return new Response(JSON.stringify(json), { status: statusCode, headers: { "content-type": "application/json;charset=utf-8" } });
    }
    jsonStringResponse(json, statusCode = 200) {
        return new Response(json, { status: statusCode, headers: { "content-type": "application/json;charset=utf-8" } });
    }
    error404Response() {
        return this.webSite.return404(this);
    }
    error500Response(error) {
        return this.webSite.return500(this, error);
    }
    //endregion
    //region Fetch / Proxy
    directProxyToServer() {
        return this.webSite.loadBalancer.directProxy(this);
    }
    directProxyWith(server) {
        return server.directProxy(this);
    }
    fetchServer(headers, method = "GET", url, body) {
        if (!url)
            url = this.urlInfos;
        return this.webSite.loadBalancer.fetch(method, url, body, headers);
    }
    //endregion
    //region Cache
    /**
     * Get from the cache the entry corresponding to the curent url.
     *
     * @param useGzippedVersion
     *      If true, returns the compressed version in priority.
     *      If it doesn't exist, then will return the uncompressed version.
     * @param metaUpdater
     *      Allow updating the meta of the cache entry.
     */
    async getFromCache(useGzippedVersion = true, metaUpdater) {
        return await this.cache.getFromCache(this.urlInfos, useGzippedVersion, metaUpdater);
    }
    async hasInCache(useGzippedVersion) {
        return await this.cache.hasInCache(this.urlInfos, useGzippedVersion);
    }
    removeFromCache(url) {
        // Avoid doublons.
        //
        if (!url) {
            url = this.urlInfos;
            url.hostname = url.hostname.toLowerCase();
            url.pathname = url.pathname.toLowerCase();
        }
        return this.cache.removeFromCache(url || this.urlInfos);
    }
    addToCache_Compressed(response, metaUpdater) {
        return this.cache.addToCache(this.urlInfos, response, this.webSite.getHeadersToCache(), false, metaUpdater);
    }
    addToCache_Uncompressed(response, metaUpdater) {
        return this.cache.addToCache(this.urlInfos, response, this.webSite.getHeadersToCache(), true, metaUpdater);
    }
    /**
     * Allow using a sub-cache.
     * For example, a cache dedicated per user.
     */
    useCache(cache) {
        this.cache = cache;
    }
    getSubCache(name) {
        return this.cache.createSubCache(name);
    }
    //endregion
    //region Test type / React on type
    getContentTypeCategory(response) {
        const contentType = response.headers.get("content-type");
        if (!contentType)
            return ContentTypeCategory.OTHER;
        if (contentType.startsWith("text/")) {
            if (contentType.startsWith("html", 5)) {
                return ContentTypeCategory.TEXT_HTML;
            }
            else if (contentType.startsWith("css")) {
                return ContentTypeCategory.TEXT_CSS;
            }
            else if (contentType.startsWith("javascript", 5)) {
                return ContentTypeCategory.TEXT_JAVASCRIPT;
            }
            else if (contentType.startsWith("json")) {
                return ContentTypeCategory.TEXT_JSON;
            }
        }
        else if (contentType.startsWith("image")) {
            return ContentTypeCategory.IMAGE;
        }
        else if (contentType.startsWith("application")) {
            if (contentType.startsWith("x-www-form-urlencoded", 12)) {
                return ContentTypeCategory.FORM_URL_ENCODED;
            }
            else if (contentType.startsWith("json", 12)) {
                return ContentTypeCategory.TEXT_JSON;
            }
            else if (contentType.startsWith("javascript", 12)) {
                return ContentTypeCategory.TEXT_JAVASCRIPT;
            }
        }
        else if (contentType.startsWith("multipart/form-data")) {
            return ContentTypeCategory.FORM_MULTIPART;
        }
        return ContentTypeCategory.OTHER;
    }
    isHtml(response) {
        const contentType = response.headers.get("content-type");
        if (contentType === null)
            return false;
        return contentType.startsWith("text/html");
    }
    isCss(response) {
        const contentType = response.headers.get("content-type");
        if (contentType === null)
            return false;
        return contentType.startsWith("text/css");
    }
    isJavascript(response) {
        const contentType = response.headers.get("content-type");
        if (contentType === null)
            return false;
        return contentType.startsWith("application/javascript") || contentType.startsWith("text/javascript");
    }
    isJson(response) {
        const contentType = response.headers.get("content-type");
        if (contentType === null)
            return false;
        return contentType.startsWith("application/json");
    }
    isXFormUrlEncoded(response) {
        const contentType = response.headers.get("content-type");
        if (contentType === null)
            return false;
        return contentType.startsWith("x-www-form-urlencoded");
    }
    async hookIfHtml(res, ...hooks) {
        if (this.isHtml(res)) {
            return new Response(await this.applyTextModifiers(res, hooks), { status: res.status, headers: res.headers });
        }
        return Promise.resolve(res);
    }
    async hookIfCss(res, ...hooks) {
        if (this.isCss(res)) {
            return new Response(await this.applyTextModifiers(res, hooks), { status: res.status, headers: res.headers });
        }
        return Promise.resolve(res);
    }
    async hookIfJavascript(res, ...hooks) {
        if (this.isJavascript(res)) {
            return new Response(await this.applyTextModifiers(res, hooks), { status: res.status, headers: res.headers });
        }
        return Promise.resolve(res);
    }
    async applyTextModifiers(res, hooks) {
        let text = await res.text();
        for (const hook of hooks) {
            const hRes = hook(text, this);
            text = hRes instanceof Promise ? await hRes : hRes;
        }
        return text;
    }
    async executeModifiers(res, hooks) {
        for (const hook of hooks) {
            const hRes = hook(res, this);
            res = hRes instanceof Promise ? await hRes : hRes;
        }
        return res;
    }
    //endregion
    //region Spy
    async duplicateReadableStream(stream) {
        if (!stream)
            return [null, null];
        return stream.tee();
    }
    async duplicateRawRequest(raw) {
        const [str1, str2] = await this.duplicateReadableStream(raw.body);
        const res1 = new Request(raw.url, {
            body: str1,
            headers: raw.headers,
            method: raw.method
        });
        const res2 = new Request(raw.url, {
            body: str2,
            headers: raw.headers,
            method: raw.method
        });
        return [res1, res2];
    }
    async duplicateResponse(raw) {
        const [str1, str2] = await this.duplicateReadableStream(raw.body);
        const res1 = new Response(str1, {
            status: raw.status,
            headers: raw.headers
        });
        const res2 = new Response(str2, {
            status: raw.status,
            headers: raw.headers
        });
        return [res1, res2];
    }
    async spyRequest(handleRequest) {
        return this.spyRequestData(handleRequest, (data) => {
            this.printSpyRequestData(data);
        });
    }
    async printSpyRequestData(data) {
        const term = NodeSpace.term;
        const headerColor = term.buildWriter(term.C_RED);
        const titleColor = term.buildWriter(term.C_ORANGE);
        let resAsText = "";
        //
        try {
            if (data.res) {
                let res = data.res();
                if (!res)
                    resAsText = "[NO SET]";
                else
                    resAsText = await res.text();
            }
            else {
                resAsText = "[NO SET]";
            }
        }
        catch {
        }
        console.log();
        console.log(headerColor(this.method, this.url));
        console.log(titleColor("|- referer: "), data.reqReferer);
        console.log(titleColor("|- reqContentType:"), data.reqContentType);
        console.log(titleColor("|- reqData:"), data.reqData);
        console.log(titleColor("|- reqCookie:"), data.reqCookies);
        console.log(titleColor("|- resContentType:"), data.resContentType);
        console.log(titleColor("|- resCookieSet:"), data.resCookieSet);
        console.log(titleColor("|- resHeaders:"), data.resHeaders);
        console.log(titleColor("|- resData:"), resAsText);
    }
    async spyRequestData(handleRequest, onSpy) {
        const [bunNewReq, spyReq] = await this.duplicateRawRequest(this.coreRequest);
        // Required because the body is already consumed.
        this.coreRequest = bunNewReq;
        let res = await handleRequest(this);
        const [bunNewRes, spyRes] = await this.duplicateResponse(res);
        // Required because the body is already consumed.
        this.coreRequest = spyReq;
        onSpy({
            method: this.method,
            res: () => spyRes,
            reqUrl: this.url,
            reqReferer: this.headers.get("referer"),
            reqContentType: this.reqContentType,
            reqData: await this.getReqDataInfos(),
            resContentType: res.headers.get("content-type"),
            resContentTypeCat: this.getContentTypeCategory(res),
            reqCookies: this.headers.get("cookie"),
            resCookieSet: spyRes.headers.getSetCookie(),
            resStatus: spyRes.status,
            resLocation: spyRes.headers.get("location"),
            resHeaders: spyRes.headers
        }, this);
        return bunNewRes;
    }
    //endregion
    //region Cookies
    hasCookie(name, value) {
        if (!this.cookies)
            this.cookies = parseCookies(this.coreRequest.headers);
        if (value)
            return this.cookies[name] === value;
        return this.cookies[name] !== undefined;
    }
    getCookie(name) {
        if (!this.cookies)
            this.cookies = parseCookies(this.coreRequest.headers);
        return this.cookies[name];
    }
    async hookIfCookie(res, name, testCookieValue, ...hooks) {
        const cookieValue = this.getCookie(name);
        if (cookieValue) {
            if (testCookieValue && !testCookieValue(cookieValue)) {
                return Promise.resolve(res);
            }
            return this.htmlResponse(await this.applyTextModifiers(res, hooks));
        }
        return Promise.resolve(res);
    }
    addCookie(res, cookieName, cookieValue, options) {
        let cookie = `${cookieName}=${cookieValue};`;
        if (options) {
            if (options.maxAge) {
                cookie += ` Max-Age=${options.maxAge};`;
            }
        }
        res.headers.append("set-cookie", cookie);
    }
    //endregion
    //region ReactJS
    isUsingReactPage = false;
    isUsingReact = false;
    reactResponse(element) {
        this.isUsingReact = true;
        this.isUsingReactPage = true;
        // Add the CSS bundle to the head.
        // This will avoid content flicking.
        //
        const hook = (controller) => {
            if (hasExternalCssBundled() || hasHydrateComponents()) {
                const bundleUrl = getBundleUrl(this.webSite);
                const hash = this.webSite.data["jopiLoaderHash"];
                controller.head.push(_jsx("link", { rel: "stylesheet", href: bundleUrl + "/loader.css?" + hash.css }, hash.css));
            }
        };
        return this.htmlResponse(ReactServer.renderToStaticMarkup(_jsx(Page, { hook: hook, children: element })));
    }
    reactToString(element) {
        this.isUsingReact = true;
        return ReactServer.renderToStaticMarkup(element);
    }
    //endregion
    //region JQuery
    asJquery(html) {
        const res = cheerio.load(html);
        initCheerio(res);
        return res;
    }
    $(html) {
        const res = cheerio.load(html);
        initCheerio(res);
        return res;
    }
    //endregion
    //region Post processing
    postProcessHtml(html) {
        if (isBrowserRefreshEnabled()) {
            html += getBrowserRefreshHtmlSnippet();
        }
        if (hasExternalCssBundled() || this.isUsingReact && hasHydrateComponents()) {
            const bundleUrl = getBundleUrl(this.webSite);
            const hash = this.webSite.data["jopiLoaderHash"];
            // If using a page, then this page already includes the CSS.
            // This allows putting it in the head, which avoids content flicking.
            //
            if (!this.isUsingReactPage) {
                html += `<link rel="stylesheet" href="${bundleUrl}/loader.css?${hash.css}" />`;
            }
            if (hasHydrateComponents()) {
                html += `<script type="module" src="${bundleUrl}/loader.js?${hash.js}"></script>`;
            }
        }
        return html;
    }
    //endregion
    //region JWT Tokens
    /**
     * Create a JWT token with the data.
     */
    createJwtToken(data) {
        return this.userJwtToken = this.webSite.createJwtToken(data);
    }
    /**
     * Extract the JWT token from the Authorization header.
     */
    getJwtToken() {
        if (this.userJwtToken) {
            return this.userJwtToken;
        }
        if (this.hasNoUserInfos) {
            return undefined;
        }
        let authHeader = this.headers.get("authorization");
        if (authHeader) {
            if (authHeader.startsWith("Bearer ")) {
                return this.userJwtToken = authHeader.slice(7);
            }
        }
        let authCookie = this.getCookie("authorization");
        if (authCookie) {
            if (authCookie.startsWith("jwt ")) {
                return this.userJwtToken = authCookie.slice(4);
            }
        }
        return undefined;
    }
    /**
     * Try to sign in the user with information you provide.
     * Return true if he is signed in, false otherwise.
     *
     * If signed in, then it automatically adds the Authorization header.
     *
     * @param loginInfo
     *      Information with things like login/password-hash/...
     *      Must match with you have used with webSite.setUserLoginManager.
     */
    async tryAuthWithJWT(loginInfo) {
        const authResult = await this.webSite.tryAuthUser(loginInfo);
        if (authResult.isOk) {
            if (!authResult.authToken)
                authResult.authToken = this.createJwtToken(authResult.userInfos);
            // The token will be added to cookie "authorization" in the post-process step.
            this.userJwtToken = authResult.authToken;
            this.userInfos = authResult.userInfos;
            return authResult;
        }
        this.userInfos = undefined;
        this.userJwtToken = undefined;
        return authResult;
    }
    /**
     * Verify and decode the JWT token.
     * Once done, the data is saved and can be read through req.userTokenData.
     */
    decodeJwtToken() {
        const token = this.getJwtToken();
        if (!token)
            return undefined;
        return this.webSite.decodeJwtToken(token);
    }
    getUserInfos() {
        if (this.userInfos)
            return this.userInfos;
        if (this.hasNoUserInfos)
            return undefined;
        const userInfos = this.decodeJwtToken();
        if (userInfos) {
            this.userInfos = userInfos;
            return userInfos;
        }
        this.hasNoUserInfos = true;
        return undefined;
    }
    hasNoUserInfos = false;
    userInfos;
    userJwtToken;
    //endregion
    //region User roles
    /**
     * Returns the roles of the user.
     */
    getUserRoles() {
        const userInfos = this.getUserInfos();
        if (!userInfos || !userInfos.roles)
            return [];
        return userInfos.roles;
    }
    /**
     * Check if the user has all these roles.
     * Return true if ok, false otherwise.
     */
    userHasRoles(requiredRoles) {
        const userInfos = this.getUserInfos();
        if (!userInfos)
            return false;
        const userRoles = userInfos.roles;
        if (!userRoles)
            return false;
        for (let role of requiredRoles) {
            if (!userRoles.includes(role))
                return false;
        }
        return true;
    }
    assertUserHasRoles(requiredRoles) {
        if (!this.userHasRoles(requiredRoles)) {
            throw new NotAuthorizedException();
        }
    }
    //endregion
    filterSearchParams(filter) {
        filter(this.urlInfos);
    }
    getContentTypeOf(response) {
        return response.headers.get("content-type");
    }
    /**
     * Allow serving a file as a response.
     */
    async serveFile(filesRootPath, options) {
        options = options || gEmptyObject;
        if (options.replaceIndexHtml !== false) {
            if (this.urlInfos.pathname.endsWith("/index.html")) {
                this.urlInfos.pathname = this.urlInfos.pathname.slice(0, -10);
                return this.redirectResponse(false);
            }
            if (this.urlInfos.pathname.endsWith("/")) {
                this.urlInfos.pathname += "index.html";
            }
        }
        const sfc = new WebSiteMirrorCache(filesRootPath);
        const fromCache = await sfc.getFromCache(this.urlInfos);
        if (fromCache)
            return fromCache;
        if (options.onNotFound) {
            return options.onNotFound(this);
        }
        return this.error404Response();
    }
}
export var ContentTypeCategory;
(function (ContentTypeCategory) {
    ContentTypeCategory[ContentTypeCategory["OTHER"] = 0] = "OTHER";
    ContentTypeCategory[ContentTypeCategory["_TEXT_"] = 10] = "_TEXT_";
    ContentTypeCategory[ContentTypeCategory["TEXT_HTML"] = 11] = "TEXT_HTML";
    ContentTypeCategory[ContentTypeCategory["TEXT_CSS"] = 12] = "TEXT_CSS";
    ContentTypeCategory[ContentTypeCategory["TEXT_JAVASCRIPT"] = 13] = "TEXT_JAVASCRIPT";
    ContentTypeCategory[ContentTypeCategory["TEXT_JSON"] = 14] = "TEXT_JSON";
    ContentTypeCategory[ContentTypeCategory["_FORM_"] = 20] = "_FORM_";
    ContentTypeCategory[ContentTypeCategory["FORM_MULTIPART"] = 20] = "FORM_MULTIPART";
    ContentTypeCategory[ContentTypeCategory["FORM_URL_ENCODED"] = 21] = "FORM_URL_ENCODED";
    ContentTypeCategory[ContentTypeCategory["_BINARY_"] = 30] = "_BINARY_";
    ContentTypeCategory[ContentTypeCategory["IMAGE"] = 31] = "IMAGE";
})(ContentTypeCategory || (ContentTypeCategory = {}));
export function newWebSite(url, options) {
    return new WebSiteImpl(url, options);
}
export class WebSiteImpl {
    port;
    hostName;
    welcomeUrl;
    isHttps = false;
    certificate;
    mainCache;
    router;
    wsRouter;
    _onNotFound;
    _on404;
    _on500;
    headersToCache = ["content-type", "etag", "last-modified"];
    middlewares;
    postMiddlewares;
    JWT_SECRET;
    jwtSignInOptions;
    authHandler;
    jwtTokenStore;
    data = {};
    loadBalancer = new LoadBalancer();
    constructor(url, options) {
        if (!options)
            options = {};
        url = url.trim().toLowerCase();
        this.welcomeUrl = url;
        this.certificate = options.certificate;
        const urlInfos = new URL(url);
        this.welcomeUrl = urlInfos.protocol + "//" + urlInfos.hostname;
        if (urlInfos.protocol === "https:")
            this.isHttps = true;
        else if (urlInfos.protocol !== "http:")
            throw new Error("invalid url");
        if (urlInfos.port) {
            this.port = parseInt(urlInfos.port);
            this.welcomeUrl += ':' + this.port;
        }
        else {
            if (this.isHttps)
                this.port = 443;
            else
                this.port = 80;
        }
        this.hostName = urlInfos.hostname;
        this.mainCache = options.cache || gVoidCache;
        this.router = createRouter();
        this.wsRouter = createRouter();
        if (hasHydrateComponents() || hasExternalCssBundled()) {
            this.addRoute("GET", "/_bundle/*", handleBundleRequest);
        }
    }
    getWelcomeUrl() {
        return this.welcomeUrl;
    }
    getCache() {
        return this.mainCache;
    }
    addRoute(method, path, handler) {
        const webSiteRoute = { handler };
        addRoute(this.router, method, path, webSiteRoute);
        return webSiteRoute;
    }
    addWsRoute(path, handler) {
        addRoute(this.wsRouter, "ws", path, handler);
    }
    addSharedRoute(method, allPath, handler) {
        const webSiteRoute = { handler };
        allPath.forEach(path => addRoute(this.router, method, path, webSiteRoute));
        return webSiteRoute;
    }
    getWebSiteRoute(method, url) {
        const matched = findRoute(this.router, method, url);
        if (!matched)
            return undefined;
        return matched.data;
    }
    onVerb(verb, path, handler) {
        handler = this.applyMiddlewares(handler);
        if (Array.isArray(path)) {
            return this.addSharedRoute(verb, path, handler);
        }
        return this.addRoute(verb, path, handler);
    }
    onGET(path, handler) {
        return this.onVerb("GET", path, handler);
    }
    onPOST(path, handler) {
        return this.onVerb("POST", path, handler);
    }
    onPUT(path, handler) {
        return this.onVerb("PUT", path, handler);
    }
    onDELETE(path, handler) {
        return this.onVerb("DELETE", path, handler);
    }
    onPATCH(path, handler) {
        return this.onVerb("PATCH", path, handler);
    }
    onHEAD(path, handler) {
        return this.onVerb("HEAD", path, handler);
    }
    onOPTIONS(path, handler) {
        return this.onVerb("OPTIONS", path, handler);
    }
    onNotFound(handler) {
        this._onNotFound = handler;
    }
    on404(handler) {
        this._on404 = handler;
    }
    on500(handler) {
        this._on500 = handler;
    }
    getRouteFor(url, method = "GET") {
        const matched = findRoute(this.router, method, url);
        if (!matched)
            return undefined;
        return matched.data;
    }
    async processRequest(urlInfos, bunRequest, serverImpl) {
        // For security reason. Without that, an attacker can break a cache.
        urlInfos.hash = "";
        const matched = findRoute(this.router, bunRequest.method, urlInfos.pathname);
        const req = new JopiRequest(this, urlInfos, bunRequest, serverImpl, (matched?.data));
        if (matched) {
            req.urlParts = matched.params;
            try {
                return await matched.data.handler(req);
            }
            catch (e) {
                if (e instanceof NotAuthorizedException) {
                    return req.textResponse(e.message, 401);
                }
                console.error(e);
                return this.return500(req, e);
            }
        }
        // Doing this allows CORS options to be sent.
        if (req.method === "OPTIONS") {
            return req.htmlResponse("");
        }
        return this.ifRouteNotFound(req);
    }
    return404(req) {
        if (this._on404) {
            return this._on404(req);
        }
        return new Response("", { status: 404 });
    }
    return500(req, error) {
        if (this._on500) {
            return this._on500(req, error);
        }
        return new Response("", { status: 404 });
    }
    async onServerStarted() {
        await createBundle(this);
        // In case we use jopin with browser refresh,
        // then we manually declare that the server is ok.
        //
        declareServerReady();
        if (this.welcomeUrl) {
            console.log("Website started:", this.welcomeUrl);
        }
    }
    getHeadersToCache() {
        return this.headersToCache;
    }
    addHeaderToCache(header) {
        header = header.trim().toLowerCase();
        if (!this.headersToCache.includes(header))
            this.headersToCache.push(header);
    }
    addMiddleware(middleware) {
        if (!this.middlewares)
            this.middlewares = [];
        this.middlewares.push(middleware);
    }
    addPostMiddleware(middleware) {
        if (!this.postMiddlewares)
            this.postMiddlewares = [];
        this.postMiddlewares.push(middleware);
    }
    addSourceServer(serverFetch, weight) {
        this.loadBalancer.addServer(serverFetch, weight);
    }
    enableCors(allows) {
        if (!allows)
            allows = [this.welcomeUrl];
        this.addPostMiddleware(PostMiddlewares.cors({ accessControlAllowOrigin: allows }));
    }
    createJwtToken(data) {
        try {
            return jwt.sign(data, this.JWT_SECRET, this.jwtSignInOptions);
        }
        catch (e) {
            return undefined;
        }
    }
    decodeJwtToken(token) {
        if (!this.JWT_SECRET)
            return undefined;
        try {
            return jwt.verify(token, this.JWT_SECRET);
        }
        catch {
            return undefined;
        }
    }
    setJwtSecret(secret) {
        this.JWT_SECRET = secret;
    }
    async tryAuthUser(loginInfo) {
        if (this.authHandler) {
            const res = this.authHandler(loginInfo);
            if (res instanceof Promise)
                return await res;
            return res;
        }
        console.warn("Your JWT secret phrase isn't configured. Please use webSite.setJwtSecret to configure it.");
        return { isOk: false };
    }
    setAuthHandler(authHandler) {
        this.authHandler = authHandler;
    }
    ifRouteNotFound(req) {
        if (this._onNotFound) {
            return this._onNotFound(req);
        }
        return this.return404(req);
    }
    storeJwtToken(req, res) {
        const token = req.getJwtToken();
        if (this.jwtTokenStore) {
            this.jwtTokenStore(req.getJwtToken(), "jwt " + token, req, res);
        }
        else {
            req.addCookie(res, "authorization", "jwt " + token, { maxAge: ONE_DAY * 7 });
        }
    }
    setJwtTokenStore(store) {
        this.jwtTokenStore = store;
    }
    applyMiddlewares(handler) {
        return async function (req) {
            const mdw = req.webSite.middlewares;
            if (mdw) {
                const count = mdw.length;
                // Use a simple loop, which allow us to add/remove middleware at runtime.
                // For example, it allows enabling / disabling logging requests.
                //
                for (let i = 0; i < count; i++) {
                    const res = mdw[i](req);
                    if (res)
                        return res;
                }
            }
            const pRes = handler(req);
            let res = pRes instanceof Promise ? await pRes : pRes;
            if (req.getJwtToken()) {
                req.webSite.storeJwtToken(req, res);
            }
            if (req.webSite.postMiddlewares) {
                const pMdw = req.webSite.postMiddlewares;
                const count = pMdw.length;
                for (let i = 0; i < count; i++) {
                    const mRes = pMdw[i](req, res);
                    res = mRes instanceof Promise ? await mRes : mRes;
                }
            }
            return res;
        };
    }
    http80WebSite;
    getOrCreateHttpRedirectWebsite() {
        if (this.http80WebSite)
            return this.http80WebSite;
        if (this.port === 80)
            return this;
        let urlInfos = new URL(this.welcomeUrl);
        urlInfos.port = "";
        urlInfos.protocol = "http";
        const webSite = new WebSiteImpl(urlInfos.href);
        this.http80WebSite = webSite;
        webSite.onGET("/**", async (req) => {
            req.urlInfos.port = "";
            req.urlInfos.protocol = "https";
            return req.redirectResponse(true, req.urlInfos.href);
        });
        return webSite;
    }
    _onRebuildCertificate;
    updateSslCertificate(certificate) {
        this.certificate = certificate;
        if (this._onRebuildCertificate)
            this._onRebuildCertificate();
    }
    declareNewWebSocketConnection(jws, infos, urlInfos) {
        const matched = findRoute(this.wsRouter, "ws", urlInfos.pathname);
        if (!matched) {
            jws.close();
            return;
        }
        try {
            matched.data(jws, infos);
        }
        catch (e) {
            console.error(e);
        }
    }
    onWebSocketConnect(path, handler) {
        return this.addWsRoute(path, handler);
    }
}
export class WebSiteOptions {
    /**
     * The TLS certificate to use;
     */
    certificate;
    /**
     * Allow defining our own cache for this website and don't use the common one.
     */
    cache;
}
export class JopiWebSocket {
    webSite;
    server;
    webSocket;
    constructor(webSite, server, webSocket) {
        this.webSite = webSite;
        this.server = server;
        this.webSocket = webSocket;
    }
    close() {
        this.webSocket.close();
    }
    onMessage(listener) {
        nSocket.onMessage(this.webSocket, listener);
    }
    sendMessage(msg) {
        nSocket.sendMessage(this.webSocket, msg);
    }
}
export class NotAuthorizedException extends Error {
}
export class ServerAlreadyStartedError extends Error {
    constructor() {
        super("the server is already");
    }
}
//endregion
//region Jopi Server
export class JopiServer {
    webSites = {};
    servers = [];
    _isStarted = false;
    addWebsite(webSite) {
        if (this._isStarted)
            throw new ServerAlreadyStartedError();
        this.webSites[webSite.hostName] = webSite;
        return webSite;
    }
    async stopServer() {
        if (!this._isStarted)
            return;
        await Promise.all(this.servers.map(server => server.stop(false)));
    }
    startServer() {
        if (this._isStarted)
            return;
        this._isStarted = true;
        /**
         * Allow avoiding a bug where returning an array with only one certificate throws an error.
         */
        function selectCertificate(certificates) {
            if (certificates.length === 0)
                return undefined;
            if (certificates.length === 1)
                return certificates[0];
            return certificates;
        }
        const byPorts = {};
        Object.values(this.webSites).forEach(e => {
            const webSite = e;
            if (!byPorts[webSite.port])
                byPorts[webSite.port] = {};
            byPorts[webSite.port][webSite.hostName] = e;
        });
        for (let port in byPorts) {
            function rebuildCertificates() {
                certificates = [];
                Object.values(hostNameMap).forEach(e => {
                    const webSite = e;
                    if (webSite.certificate) {
                        const keyFile = path.resolve(webSite.certificate.key);
                        const certFile = path.resolve(webSite.certificate.cert);
                        certificates.push({
                            key: nFS.readTextSyncFromFile(keyFile),
                            cert: nFS.readTextSyncFromFile(certFile),
                            serverName: webSite.hostName
                        });
                    }
                });
            }
            const hostNameMap = byPorts[port];
            let certificates = [];
            rebuildCertificates();
            Object.values(hostNameMap).forEach(webSite => webSite._onRebuildCertificate = () => {
                rebuildCertificates();
                let certificate = selectCertificate(certificates);
                myServerOptions.tls = certificate;
                serverImpl.updateSslCertificate(myServerInstance, myServerOptions, certificate);
            });
            const myServerOptions = {
                ...gServerStartGlobalOptions,
                port,
                tls: selectCertificate(certificates),
                fetch: req => {
                    const urlInfos = new URL(req.url);
                    const webSite = hostNameMap[urlInfos.hostname];
                    if (!webSite)
                        return new Response("", { status: 404 });
                    return webSite.processRequest(urlInfos, req, myServerInstance);
                },
                async onWebSocketConnection(ws, infos) {
                    const urlInfos = new URL(infos.url);
                    const webSite = hostNameMap[urlInfos.hostname];
                    if (!webSite) {
                        ws.close();
                        return;
                    }
                    const jws = new JopiWebSocket(webSite, myServerInstance, ws);
                    webSite.declareNewWebSocketConnection(jws, infos, urlInfos);
                }
            };
            const myServerInstance = serverImpl.startServer(myServerOptions);
            Object.values(hostNameMap).forEach(webSite => webSite.onServerStarted());
            this.servers.push(myServerInstance);
        }
    }
    /**
     * Generate a certificat for dev test.
     * Require "mkcert" to be installed.
     * See: https://github.com/FiloSottile/mkcert
     */
    async createDevCertificate(hostName, certsDir = "certs") {
        const sslDirPath = path.resolve(certsDir, hostName);
        const keyFilePath = path.join(sslDirPath, "certificate.key");
        const certFilePath = path.join(sslDirPath, "certificate.crt.key");
        if (!await nFS.isFile(certFilePath)) {
            let mkCertToolPath = findExecutable("mkcert", null);
            if (mkCertToolPath) {
                await fs.mkdir(sslDirPath, { recursive: true });
                await nOS.exec(`cd ${sslDirPath}; ${mkCertToolPath} -install; ${mkCertToolPath} --cert-file certificate.crt.key --key-file certificate.key ${hostName} localhost 127.0.0.1 ::1`);
            }
            else {
                throw "Can't generate certificate, mkcert tool not found. See here for installation: https://github.com/FiloSottile/mkcert";
            }
        }
        return { key: keyFilePath, cert: certFilePath };
    }
}
export function getServerStartOptions() {
    return gServerStartGlobalOptions;
}
export var MetaUpdaterResult;
(function (MetaUpdaterResult) {
    MetaUpdaterResult[MetaUpdaterResult["IS_NOT_UPDATED"] = 0] = "IS_NOT_UPDATED";
    MetaUpdaterResult[MetaUpdaterResult["IS_UPDATED"] = 1] = "IS_UPDATED";
    MetaUpdaterResult[MetaUpdaterResult["MUST_DELETE"] = 2] = "MUST_DELETE";
})(MetaUpdaterResult || (MetaUpdaterResult = {}));
export class WebSiteMirrorCache {
    rootDir;
    constructor(rootDir) {
        if (!rootDir)
            rootDir = ".";
        if (!path.isAbsolute(rootDir))
            rootDir = path.resolve(process.cwd(), rootDir);
        this.rootDir = rootDir;
    }
    calKey(url) {
        url = new URL(url);
        url.hostname = "localhost";
        url.port = "";
        url.protocol = "file:";
        const sURL = url.toString();
        return nFS.fileURLToPath(sURL);
    }
    calcFilePath(url) {
        let fp = path.join(this.rootDir, this.calKey(url));
        if (fp.endsWith("/")) {
            fp += "index.html";
        }
        else {
            const ext = path.extname(fp);
            if (!ext)
                fp += "/index.html";
        }
        return fp;
    }
    async addToCache(url, response) {
        // We don't store 404 and others.
        if (response.status !== 200)
            return response;
        const filePath = this.calcFilePath(url);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        try {
            if (!response.body)
                return response;
            const [bodyRes, bodySaveFile] = response.body.tee();
            await nFS.writeResponseToFile(new Response(bodySaveFile), filePath);
            const headers = {
                "content-type": nFS.getMimeTypeFromName(filePath),
                "content-length": await nFS.getFileSize(filePath)
            };
            return new Response(bodyRes, { status: 200, headers });
        }
        catch (e) {
            console.error(e);
            return new Response("", { status: 500 });
        }
    }
    async removeFromCache(url) {
        const filePath = this.calcFilePath(url);
        await fs.unlink(filePath);
    }
    async hasInCache(url) {
        const filePath = this.calcFilePath(url);
        const stats = await nFS.getFileStat(filePath);
        return !!stats && stats.isFile();
    }
    async getFromCache(url) {
        const filePath = this.calcFilePath(url);
        const stats = await nFS.getFileStat(filePath);
        if (stats && stats.isFile()) {
            let contentType = nFS.getMimeTypeFromName(filePath);
            const contentLength = stats.size;
            const headers = {
                "content-type": contentType,
                "content-length": contentLength.toString()
            };
            return nFS.createResponseFromFile(filePath, 200, headers);
        }
        return undefined;
    }
    async getMeta(url) {
        const filePath = this.calcFilePath(url);
        try {
            const text = await nFS.readTextFromFile(filePath + " meta");
            return JSON.parse(text);
        }
        catch {
            // We are here if the meta doesn't exist.
            return Promise.resolve(undefined);
        }
    }
    createSubCache(name) {
        const newDir = path.join(this.rootDir, "_ subCaches", name);
        return new WebSiteMirrorCache(newDir);
    }
}
export class VoidPageCache {
    getFromCache() {
        return Promise.resolve(undefined);
    }
    addToCache(_url, response) {
        return Promise.resolve(response);
    }
    hasInCache() {
        return Promise.resolve(false);
    }
    removeFromCache(_url) {
        return Promise.resolve();
    }
    getMeta(_url) {
        return Promise.resolve(undefined);
    }
    createSubCache() {
        return this;
    }
}
const gVoidCache = new VoidPageCache();
//endregion
//region JQuery
/**
 * Add our own function to cheerio.
 * Note: the definition type has directly been added to cheerio.d.ts.
 */
function initCheerio($) {
    $.prototype.reactReplaceWith = function (node) {
        // Note: "this: cheerio.Cheerio" allows casting the value of this.
        this.replaceWith(ReactServer.renderToStaticMarkup(node));
        return this;
    };
    $.prototype.reactReplaceContentWith = function (node) {
        // Note: "this: cheerio.Cheerio" allows casting the value of this.
        return this.html(ReactServer.renderToStaticMarkup(node));
    };
}
//endregion
//region Tools
export function parseCookies(headers) {
    const cookies = {};
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
export function readContentLength(headers) {
    const cl = headers.get("content-length");
    if (!cl)
        return -1;
    return parseInt(cl);
}
export function cacheEntryToResponse(entry) {
    if (entry.binary) {
        let headers = entry.headers;
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
const gDefaultHeadersToCache = ["content-type", "etag", "last-modified"];
export function responseToCacheEntry(response, headersToInclude, meta, isGzipped) {
    const status = response.status;
    const entry = { meta, isGzipped, status };
    if (status === 200) {
        const headers = {};
        entry.headers = headers;
        // "content-type", "etag", "last-modified"
        if (!headersToInclude)
            headersToInclude = gDefaultHeadersToCache;
        headersToInclude.forEach(header => addHeaderIfExist(headers, header, response.headers));
    }
    if ((status >= 300) && (status < 400)) {
        entry.headers = {};
        addHeaderIfExist(entry.headers, "Location", response.headers);
    }
    return entry;
}
export function addHeaderIfExist(headers, headerName, source) {
    const v = source.get(headerName);
    if (v !== null)
        headers[headerName] = v;
}
export function octetToMo(size) {
    const res = size / ONE_MEGA_OCTET;
    return Math.trunc(res * 100) / 100;
}
export const ONE_KILO_OCTET = 1024;
export const ONE_MEGA_OCTET = 1024 * ONE_KILO_OCTET;
export const HTTP_VERBS = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"];
const gEmptyObject = {};
const gServerStartGlobalOptions = {};
//endregion
// In case we are using Jopi Loader (jopin).
//
// The load must not refresh the browser once this process created but wait until we are ready.
// The main reason is that we create as JavaScript bundle that takes time to create, and the
// browser must not refresh too soon (event if it's only one second)
//
mustWaitServerReady();
//# sourceMappingURL=core.js.map