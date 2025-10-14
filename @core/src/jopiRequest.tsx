// noinspection JSUnusedGlobalSymbols

import type {ServerInstance, ServerSocketAddress} from "./jopiServer.ts";
import {ServerFetch} from "./serverFetch.ts";
import React, {type ReactNode} from "react";
import {PageController_ExposePrivate, type PageOptions, renderPage} from "jopi-rewrite/ui";
import * as ReactServer from "react-dom/server";
import * as cheerio from "cheerio";
import {getBrowserRefreshHtmlSnippet, isBrowserRefreshEnabled} from "jopi-rewrite/loader-client";
import type {SearchParamFilterFunction} from "./searchParamFilter.ts";
import {ZodObject, ZodError} from "zod";

import {initCheerio} from "./jQuery.ts";
import {type CacheEntry, type PageCache, WebSiteMirrorCache} from "./caches/cache.ts";
import {
    type AuthResult,
    type CookieOptions, DirectSendThisResponseException,
    type HttpMethod, type JopiRouteHandler, type LoginPassword, NotAuthorizedException,
    type RequestBody,
    type ResponseModifier, type ServeFileOptions, type TestCookieValue, type TextModifier, type UserInfos,
    type WebSite,
    WebSiteImpl,
    type WebSiteRoute
} from "./jopiWebSite.tsx";

import {parseCookies} from "./internalTools.ts";
import * as ns_term from "jopi-node-space/ns_term";
import * as ns_fs from "jopi-node-space/ns_fs";
import {hasExternalCssToBundle} from "./bundler/extraContent.ts";
import {hasHydrateComponents} from "./hydrate.ts";
import {getBundleEntryPointUrl_JS, getBundleEntryPointUrl_CSS} from "./bundler/server.ts";

export class JopiRequest {
    public cache: PageCache;
    public readonly mustUseAutoCache: boolean;

    public readonly mainCache: PageCache;
    private cookies?: { [name: string]: string };
    private _headers: Headers;

    constructor(public readonly webSite: WebSite,
                public readonly urlInfos: URL,
                public coreRequest: Request,
                public readonly coreServer: ServerInstance,
                public readonly route: WebSiteRoute)
    {
        this.cache = (webSite as WebSiteImpl).mainCache;
        this.mustUseAutoCache = (webSite as WebSiteImpl).mustUseAutomaticCache && route && (route.mustDisableAutomaticCache!==true);

        this.mainCache = this.cache;
        this._headers = this.coreRequest.headers;
    }

    //region Properties

    private _customData?: any;

    get customData(): any {
        if (!this._customData) this._customData = {};
        return this._customData;
    }

    /**
     * Return the verb used for the request (GET, POST, PUT, DELETE, ...)
     */
    get method(): HttpMethod {
        return this.coreRequest.method as HttpMethod;
    }

    /**
     * Return the content type of the request.
     */
    get reqContentType(): string | null {
        return this.coreRequest.headers.get("content-type");
    }

    get url(): string {
        return this.coreRequest.url;
    }

    get body(): RequestBody {
        return this.coreRequest.body;
    }

    get headers(): Headers {
        return this._headers;
    }

    set headers(value: Headers) {
        this._headers = value;
    }

    /**
     * The part of the url.
     * if : https://mywebsite/product-name/list
     * and route http://mywebsite/:product/list
     * then urlParts contains {product: "product-name"}
     */
    urlParts?: any;

    /**
     * Returns the url search params.
     * For "https://my-site/?sort=asc&filter=jopi", it returns {sort: "asc", filter: "jopi"}.
     */
    get urlSearchParams(): any {
        const sp = this.urlInfos.searchParams;
        if (!sp.size) return {};

        const res: any = {};
        sp.forEach((value, key) => res[key] = value);
        return res;
    }

    /**
     * Returns information on the caller IP.
     */
    get requestIP(): ServerSocketAddress | null {
        return this.coreServer.requestIP(this.coreRequest);
    }

    get isFromLocalhost() {
        const ip = this.requestIP;
        if (!ip) return false;

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
    async getReqData<T>(options?: {ignoreUrl?: boolean, zodSchema?: ZodObject}): Promise<T> {
        let res: any = {};

        if (!(options && options.ignoreUrl)) {
            const searchParams = this.urlInfos.searchParams;

            if (searchParams.size) {
                searchParams.forEach((value, key) => res[key] = value);
            }

            if (this.urlParts) {
                res = {...res, ...this.urlParts};
            }
        }

        if (this.isReqBodyJson) {
            try {
                const asJson = await this.reqBodyAsJson();
                if (asJson) res = {...res, ...asJson};
            } catch {
                // If JSON is invalid.
            }
        } else if (this.isReqBodyXFormUrlEncoded) {
            try {
                let data = await this.reqBodyAsText();
                new URLSearchParams(data).forEach((value, key) => res[key] = value);
            } catch {
                // If invalid.
            }
        } else if (this.isReqBodyFormData) {
            try {
                const asFormData = await this.reqBodyAsFormData();
                asFormData.forEach((value, key) => res[key] = value);
            } catch {
                // If FormData is invalid.
            }
        }

        if (options && options.zodSchema) {
            this.validateZodSchema(res, options.zodSchema);
        }

        return res as T;
    }

    /**
     * Returns all the data about the request, organized by category.
     */
    async getReqDataInfos(): Promise<any> {
        let res: any = {};

        const searchParams = this.urlInfos.searchParams;

        if (searchParams.size) {
            const t: any = res.searchParams = {};
            searchParams.forEach((value, key) => t[key] = value);
        }

        if (this.urlParts) {
            res.urlParts = {...this.urlParts};
        }

        if (this.isReqBodyJson) {
            try {
                res.body = await this.reqBodyAsJson();
            } catch {
                // If JSON is invalid.
            }
        } else if (this.isReqBodyFormData) {
            try {
                const t: any = res.formData = {};
                const asFormData = await this.reqBodyAsFormData();
                asFormData.forEach((value, key) => t[key] = value);
            } catch {
                // If FormData is invalid.
            }
        } else if (this.isReqBodyXFormUrlEncoded) {
            try {
                let data = await this.reqBodyAsText();
                const t: any = res.formUrlEncoded = {};
                new URLSearchParams(data).forEach((value, key) => t[key] = value);
            } catch {
                // If invalid.
            }
        }

        return res;
    }

    /**
     * https://developer.mozilla.org/en-US/docs/Web/API/Request/bodyUsed
     */
    get isReqBodyUsed(): boolean {
        return this.coreRequest.bodyUsed;
    }

    get isReqBodyJson(): boolean {
        const ct = this.reqContentType;
        if (ct === null) return false;
        return ct.startsWith("application/json");
    }

    get isReqBodyFormData(): boolean {
        const ct = this.reqContentType;
        if (ct === null) return false;
        return ct.startsWith("multipart/form-data");
    }

    get isReqBodyXFormUrlEncoded(): boolean {
        const ct = this.reqContentType;
        if (ct === null) return false;
        return ct.startsWith("application/x-www-form-urlencoded");
    }

    reqBodyAsText(): Promise<string> {
        return this.coreRequest.text();
    }

    /**
     * Validate the Zod Schema.
     * If invalid, throw a special exception allowing
     * to directly send a response to the caller.
     */
    validateZodSchema(data: any, schema: ZodObject) {
        try {
            schema.parse(data);
        }
        catch (error) {
            if (error instanceof ZodError) {
                throw new DirectSendThisResponseException(new Response("Invalid data", {status: 400}));
            }
        }
    }

    async reqBodyAsJson<T = any>(zodSchema?: ZodObject): Promise<T> {
        if (zodSchema) {
            const data = await this.reqBodyAsJson();
            this.validateZodSchema(data, zodSchema);
            return data;
        }

        return await this.coreRequest.json() as Promise<T>;
    }

    /**
     * https://developer.mozilla.org/en-US/docs/Web/API/Request/arrayBuffer
     */
    reqBodyAsArrayBuffer(): Promise<ArrayBuffer> {
        return this.coreRequest.arrayBuffer();
    }

    /**
     * https://developer.mozilla.org/en-US/docs/Web/API/Request/blob
     */
    reqBodyAsBlob(): Promise<Blob> {
        return this.coreRequest.blob();
    }

    /**
     * https://developer.mozilla.org/en-US/docs/Web/API/Request/bytes
     */
    reqBodyAsBytes(): Promise<Uint8Array> {
        return this.coreRequest.bytes();
    }

    /**
     * https://developer.mozilla.org/en-US/docs/Web/API/Request/formData
     */
    reqBodyAsFormData(): Promise<FormData> {
        return this.coreRequest.formData();
    }

    //endregion

    //region Request timeout

    /**
     * When DDOS protection is enabled, the request has a timeout of 60 seconds.
     * Here it'd allow you to extend this time for a request you knew was slow.
     */
    extendTimeout_sec(sec: number) {
        this.coreServer.timeout(this.coreRequest, sec);
    }

    //endregion

    //region Response helpers

    redirectResponse(permanent: boolean = false, url?: string | URL) {
        if (!url) url = this.urlInfos;
        return new Response(null, {status: permanent ? 301 : 302, headers: {"location": url.toString()}});
    }

    textResponse(text: string, statusCode: number = 200) {
        return new Response(text, {status: statusCode, headers: {"content-type": "text/plain;charset=utf-8"}});
    }

    htmlResponse(html: string, statusCode: number = 200) {
        html = this.postProcessHtml(html);
        return new Response(html, {status: statusCode, headers: {"content-type": "text/html;charset=utf-8"}});
    }

    jsonResponse(json: any, statusCode: number = 200) {
        return new Response(JSON.stringify(json), {
            status: statusCode,
            headers: {"content-type": "application/json;charset=utf-8"}
        });
    }

    jsonStringResponse(json: string, statusCode: number = 200) {
        return new Response(json, {status: statusCode, headers: {"content-type": "application/json;charset=utf-8"}});
    }

    returnError404_NotFound(): Response | Promise<Response> {
        return this.webSite.return404(this);
    }

    returnError500_ServerError(error?: Error | string): Response | Promise<Response> {
        return this.webSite.return500(this, error);
    }

    returnError401_Unauthorized(error?: Error | string): Response | Promise<Response> {
        return this.webSite.return401(this, error);
    }

    //endregion

    //region Fetch / Proxy

    directProxyToServer(): Promise<Response> {
        return (this.webSite as WebSiteImpl).loadBalancer.directProxy(this);
    }

    directProxyWith(server: ServerFetch<any>): Promise<Response> {
        return server.directProxy(this);
    }

    fetchServer(headers?: Headers, method: string = "GET", url?: URL, body?: RequestBody): Promise<Response> {
        if (!url) url = this.urlInfos;
        return (this.webSite as WebSiteImpl).loadBalancer.fetch(method, url, body, headers);
    }

    //endregion

    //region Cache

    private _isAddedToCache = false;

    /**
     * Get from the cache the entry corresponding to the current url.
     *
     * @param useGzippedVersion
     *      If true, returns the compressed version in priority.
     *      If it doesn't exist, then will return the uncompressed version.
     */
    async getFromCache(useGzippedVersion: boolean = true): Promise<Response | undefined> {
        return await this.cache.getFromCache(this.urlInfos, useGzippedVersion);
    }

    async hasInCache(useGzippedVersion?: boolean | undefined): Promise<boolean> {
        return await this.cache.hasInCache(this.urlInfos, useGzippedVersion);
    }

    removeFromCache(url?: URL): Promise<void> {
        // Avoid double.
        //
        if (!url) {
            url = this.urlInfos;
            url.hostname = url.hostname.toLowerCase();
            url.pathname = url.pathname.toLowerCase();
        }

        return this.cache.removeFromCache(url || this.urlInfos);
    }

    addToCache(response: Response) {
        // Avoid adding two times in the same request.
        // This is required with automatic add functionnality.
        //
        if (this._isAddedToCache) return;
        this._isAddedToCache = false;

        return this.addToCache_Compressed(response);
    }

    addToCache_Compressed(response: Response): Promise<Response> {
        return this.cache.addToCache(this.urlInfos, response, (this.webSite as WebSiteImpl).getHeadersToCache(), false);
    }

    addToCache_Uncompressed(response: Response): Promise<Response> {
        return this.cache.addToCache(this.urlInfos, response, (this.webSite as WebSiteImpl).getHeadersToCache(), true);
    }

    /**
     * Allow using a sub-cache.
     * For example, a cache dedicated per user.
     */
    useCache(cache: PageCache) {
        this.cache = cache;
    }

    getSubCache(name: string): PageCache {
        return this.cache.createSubCache(name);
    }

    getCacheEntryIterator(): Iterable<CacheEntry> {
        return this.cache.getCacheEntryIterator();
    }

    //endregion

    //region Test type / React on type

    getContentTypeCategory(response: Response): ContentTypeCategory {
        const contentType = response.headers.get("content-type");
        if (!contentType) return ContentTypeCategory.OTHER;

        if (contentType.startsWith("text/")) {
            if (contentType.startsWith("html", 5)) {
                return ContentTypeCategory.TEXT_HTML;
            } else if (contentType.startsWith("css")) {
                return ContentTypeCategory.TEXT_CSS;
            } else if (contentType.startsWith("javascript", 5)) {
                return ContentTypeCategory.TEXT_JAVASCRIPT;
            } else if (contentType.startsWith("json")) {
                return ContentTypeCategory.TEXT_JSON;
            }
        } else if (contentType.startsWith("image")) {
            return ContentTypeCategory.IMAGE;
        } else if (contentType.startsWith("application")) {
            if (contentType.startsWith("x-www-form-urlencoded", 12)) {
                return ContentTypeCategory.FORM_URL_ENCODED;
            } else if (contentType.startsWith("json", 12)) {
                return ContentTypeCategory.TEXT_JSON;
            } else if (contentType.startsWith("javascript", 12)) {
                return ContentTypeCategory.TEXT_JAVASCRIPT;
            }
        } else if (contentType.startsWith("multipart/form-data")) {
            return ContentTypeCategory.FORM_MULTIPART;
        }

        return ContentTypeCategory.OTHER;
    }

    isHtml(response: Response): boolean {
        const contentType = response.headers.get("content-type");
        if (contentType === null) return false;
        return contentType.startsWith("text/html");
    }

    isCss(response: Response): boolean {
        const contentType = response.headers.get("content-type");
        if (contentType === null) return false;
        return contentType.startsWith("text/css");
    }

    isJavascript(response: Response): boolean {
        const contentType = response.headers.get("content-type");
        if (contentType === null) return false;
        return contentType.startsWith("application/javascript") || contentType.startsWith("text/javascript");
    }

    isJson(response: Response): boolean {
        const contentType = response.headers.get("content-type");
        if (contentType === null) return false;
        return contentType.startsWith("application/json");
    }

    isXFormUrlEncoded(response: Response): boolean {
        const contentType = response.headers.get("content-type");
        if (contentType === null) return false;
        return contentType.startsWith("x-www-form-urlencoded");
    }

    async hookIfHtml(res: Response, ...hooks: TextModifier[]): Promise<Response> {
        if (this.isHtml(res)) {
            return new Response(
                await this.applyTextModifiers(res, hooks),
                {status: res.status, headers: res.headers}
            );
        }

        return Promise.resolve(res);
    }

    async hookIfCss(res: Response, ...hooks: TextModifier[]): Promise<Response> {
        if (this.isCss(res)) {
            return new Response(
                await this.applyTextModifiers(res, hooks),
                {status: res.status, headers: res.headers}
            );
        }

        return Promise.resolve(res);
    }

    async hookIfJavascript(res: Response, ...hooks: TextModifier[]): Promise<Response> {
        if (this.isJavascript(res)) {
            return new Response(
                await this.applyTextModifiers(res, hooks),
                {status: res.status, headers: res.headers}
            );
        }

        return Promise.resolve(res);
    }

    async applyTextModifiers(res: Response, hooks: TextModifier[]): Promise<string> {
        let text = await res.text() as string;

        for (const hook of hooks) {
            const hRes = hook(text, this);
            text = hRes instanceof Promise ? await hRes : hRes;
        }

        return text;
    }

    async executeModifiers(res: Response, hooks: ResponseModifier[]): Promise<Response> {
        for (const hook of hooks) {
            const hRes = hook(res, this);
            res = hRes instanceof Promise ? await hRes : hRes;
        }

        return res;
    }

    //endregion

    //region Spy

    async duplicateReadableStream(stream: ReadableStream | null): Promise<(ReadableStream<any> | null)[]> {
        if (!stream) return [null, null];
        return stream.tee();
    }

    async duplicateRawRequest(raw: Request): Promise<[Request, Request]> {
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

    async duplicateResponse(raw: Response): Promise<[Response, Response]> {
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

    async spyRequest(handleRequest: (req: JopiRequest) => Promise<Response>): Promise<Response> {
        return this.spyRequestData(handleRequest, (data) => {
            this.printSpyRequestData(data);
        });
    }

    async printSpyRequestData(data: JopiRequestSpyData) {
        const headerColor = ns_term.buildWriter(ns_term.C_RED);
        const titleColor = ns_term.buildWriter(ns_term.C_ORANGE);

        let resAsText = "";
        //
        try {
            if (data.res) {
                let res = data.res();
                if (!res) resAsText = "[NO SET]";
                else resAsText = await res.text()
            } else {
                resAsText = "[NO SET]";
            }
        } catch {
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

    async spyRequestData(handleRequest: JopiRouteHandler, onSpy: JopiRequestSpy): Promise<Response> {
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

    hasCookie(name: string, value?: string): boolean {
        if (!this.cookies) this.cookies = parseCookies(this.coreRequest.headers);
        if (value) return this.cookies[name] === value;
        return this.cookies[name] !== undefined;
    }

    getCookie(name: string): string | undefined {
        if (!this.cookies) this.cookies = parseCookies(this.coreRequest.headers);
        return this.cookies[name];
    }

    async hookIfCookie(res: Response, name: string, testCookieValue: null | undefined | TestCookieValue, ...hooks: TextModifier[]): Promise<Response> {
        const cookieValue = this.getCookie(name);

        if (cookieValue) {
            if (testCookieValue && !testCookieValue(cookieValue)) {
                return Promise.resolve(res);
            }

            return this.htmlResponse(await this.applyTextModifiers(res, hooks));
        }

        return Promise.resolve(res);
    }

    addCookie(res: Response, cookieName: string, cookieValue: string, options?: CookieOptions) {
        let cookie = `${cookieName}=${cookieValue};`;

        if (options) {
            if (options.maxAge) {
                cookie += ` Max-Age=${options.maxAge};`;
            }
        }

        let current = res.headers.get("set-cookie");
        if (current) cookie = current + cookie;

        res.headers.append("set-cookie", cookie);
    }

    //endregion

    //region ReactJS

    private isUsingReactPage = false;
    private isUsingReact = false;

    reactResponse(element: ReactNode, options?: PageOptions) {
        this.isUsingReact = true;
        this.isUsingReactPage = true;

        // Add the CSS bundle to the head.
        // This will avoid content flicking.
        //
        const hook = (controller: PageController_ExposePrivate) => {
            // Allow bounding the controller to the request.
            controller.setServerRequest(this);

            if (hasExternalCssToBundle() || hasHydrateComponents()) {
                const cssEntryPointUrl = getBundleEntryPointUrl_CSS(this.webSite);
                const hash = this.webSite.data["jopiLoaderHash"];

                controller.addToHeader("jopi-bundle-style",
                    <link rel="stylesheet" key={hash.css}
                          href={cssEntryPointUrl + "?" + hash.css}/>
                );
            }

            (this.webSite as WebSiteImpl).applyPageRenderInitializers(this, controller);
        }

        return this.htmlResponse(ReactServer.renderToStaticMarkup(renderPage(element, hook, options)));
    }

    reactToString(element: ReactNode): string {
        this.isUsingReact = true;
        return ReactServer.renderToStaticMarkup(element);
    }

    //endregion

    //region JQuery

    asJquery(html: string) {
        const res = cheerio.load(html);
        initCheerio(res);
        return res;
    }

    $(html: string) {
        const res = cheerio.load(html);
        initCheerio(res);
        return res;
    }

    //endregion

    //region Post processing

    private postProcessHtml(html: string): string {
        if (isBrowserRefreshEnabled()) {
            html += getBrowserRefreshHtmlSnippet();
        }

        if (hasExternalCssToBundle() || this.isUsingReact && hasHydrateComponents()) {
            const jsEntryPointUrl = getBundleEntryPointUrl_JS(this.webSite);
            const cssEntryPointUrl = getBundleEntryPointUrl_CSS(this.webSite);
            const hash = this.webSite.data["jopiLoaderHash"];

            // If using a page, then this page already includes the CSS.
            // This allows putting it in the head, which avoids content flicking.
            //
            if (!this.isUsingReactPage) {
                html += `<link rel="stylesheet" href="${cssEntryPointUrl}/?${hash.css}" />`;
            }

            if (hasHydrateComponents()) {
                html += `<script type="module" src="${jsEntryPointUrl}?${hash.js}"></script>`;
            }
        }

        return html;
    }

    //endregion

    //region JWT Tokens

    /**
     * Create a JWT token with the data.
     */
    createJwtToken(data: UserInfos): string | undefined {
        return this.userJwtToken = this.webSite.createJwtToken(data);
    }

    /**
     * Extract the JWT token from the Authorization header.
     */
    getJwtToken(): string | undefined {
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
    async tryAuthWithJWT<T = LoginPassword>(loginInfo: T): Promise<AuthResult> {
        const authResult = await this.webSite.tryAuthUser(loginInfo);

        if (authResult.isOk) {
            if (!authResult.authToken) {
                authResult.authToken = this.createJwtToken(authResult.userInfos!);
            }

            // The token will be added to cookie "authorization" in the post-process step.
            this.userJwtToken = authResult.authToken;
            this.userInfos = authResult.userInfos!;

            // --> The cookie will be stored inside the response
            //     through the WebSite.applyMiddlewares / call to storeJwtToken.

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
    private decodeJwtToken(): UserInfos | undefined {
        const token = this.getJwtToken();
        if (!token) return undefined;
        return this.webSite.decodeJwtToken(token);
    }

    public getUserInfos(): UserInfos | undefined {
        if (this.userInfos) return this.userInfos;
        if (this.hasNoUserInfos) return undefined;

        const userInfos = this.decodeJwtToken();

        if (userInfos) {
            this.userInfos = userInfos;
            return userInfos;
        }

        this.hasNoUserInfos = true;
        return undefined;
    }

    public requireUserInfos(): UserInfos {
        let userInfos = this.getUserInfos();
        if (!userInfos) throw new NotAuthorizedException();
        return userInfos;
    }

    private hasNoUserInfos: boolean = false;
    private userInfos?: UserInfos;
    private userJwtToken?: string;

    //endregion

    //region User roles

    /**
     * Returns the roles of the user.
     */
    public getUserRoles(): string[] {
        const userInfos = this.getUserInfos();
        if (!userInfos || !userInfos.roles) return [];
        return userInfos.roles;
    }

    /**
     * Check if the user has all these roles.
     * Return true if ok, false otherwise.
     */
    public userHasRoles(requiredRoles: string[]): boolean {
        const userInfos = this.getUserInfos();
        if (!userInfos) return false;

        const userRoles = userInfos.roles;
        if (!userRoles) return false;

        for (let role of requiredRoles) {
            if (!userRoles.includes(role)) return false;
        }

        return true;
    }

    public assertUserHasRoles(requiredRoles: string[]) {
        if (!this.userHasRoles(requiredRoles)) {
            throw new NotAuthorizedException();
        }
    }

    //endregion

    filterSearchParams(filter?: SearchParamFilterFunction) {
        if (filter) {
            filter(this.urlInfos);
        } else {
            if (this.route.searchParamFilter) {
                this.route.searchParamFilter(this.urlInfos);
            }
        }
    }

    getContentTypeOf(response: Response): string | null {
        return response.headers.get("content-type");
    }

    async returnFile(filePath: string): Promise<Response> {
        let res = await this.tryReturnFile(filePath);
        if (res) return res;

        return this.returnError404_NotFound();
    }

    async tryReturnFile(filePath: string): Promise<Response|undefined> {
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

    /**
     * Allow serving a file as a response.
     * Automatically get the file from the url and a root dir.
     */
    async serverFromDir(filesRootPath: string, options?: ServeFileOptions): Promise<Response> {
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
        if (fromCache) return fromCache;

        if (options.onNotFound) {
            return options.onNotFound(this);
        }

        return this.returnError404_NotFound();
    }
}

export interface JopiRequestSpyData {
    method: string;

    reqUrl: string;
    reqReferer: string | null;
    reqContentType: string | null;
    reqData: any;

    // Allow avoiding printing the response content.
    res: (() => Response) | undefined | null;

    resContentType: string | null;
    resContentTypeCat: ContentTypeCategory;

    resStatus: number;
    resLocation: string | null;
    resHeaders: Headers | undefined | null;

    reqCookies: string | null;
    resCookieSet: string[] | null;
}

export type JopiRequestSpy = (data: JopiRequestSpyData, req: JopiRequest) => void;

export enum ContentTypeCategory {
    OTHER,

    _TEXT_ = 10,
    TEXT_HTML = 11,
    TEXT_CSS = 12,
    TEXT_JAVASCRIPT = 13,
    TEXT_JSON = 14,

    _FORM_ = 20,
    FORM_MULTIPART = 20,
    FORM_URL_ENCODED = 21,

    _BINARY_ = 30,
    IMAGE
}

const gEmptyObject = {};