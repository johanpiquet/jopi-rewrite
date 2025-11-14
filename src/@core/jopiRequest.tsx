// noinspection JSUnusedGlobalSymbols

import type {CoreServer, ServerSocketAddress} from "./jopiServer.ts";
import {ServerFetch} from "./serverFetch.ts";
import React, {type ReactNode} from "react";
import {PageController_ExposePrivate} from "jopi-rewrite/ui";
import * as ReactServer from "react-dom/server";
import * as cheerio from "cheerio";
import type {SearchParamFilterFunction} from "./searchParamFilter.ts";
import * as jk_schema from "jopi-toolkit/jk_schema";
import * as jk_what from "jopi-toolkit/jk_what";
import Page from "./PageComponent.tsx";

import {initCheerio} from "./jQuery.ts";
import {type CacheEntry, type PageCache, WebSiteMirrorCache} from "./caches/cache.ts";
import {
    type AuthResult,
    type CookieOptions, SBPE_DirectSendThisResponseException,
    type HttpMethod, type JopiRouteHandler, type LoginPassword, SBPE_NotAuthorizedException,
    type RequestBody,
    type ResponseModifier, type ServeFileOptions, type TestCookieValue, type TextModifier, type UserInfos,
    type WebSite,
    WebSiteImpl,
    type WebSiteRouteInfos
} from "./jopiWebSite.tsx";

import {parseCookies} from "./internalTools.ts";
import * as jk_term from "jopi-toolkit/jk_term";
import * as jk_fs from "jopi-toolkit/jk_fs";
import {isNodeJS} from "jopi-toolkit/jk_what";

export class JopiRequest {
    public cache: PageCache;
    public readonly mustUseAutoCache: boolean;

    public readonly mainCache: PageCache;
    private cookies?: { [name: string]: string };
    private _headers: Headers;

    constructor(public readonly webSite: WebSite,
                private _urlInfos: URL|undefined,
                public coreRequest: Request,
                public readonly coreServer: CoreServer,
                public readonly routeInfos: WebSiteRouteInfos)
    {
        this.cache = (webSite as WebSiteImpl).mainCache;
        this.mustUseAutoCache = (webSite as WebSiteImpl).mustUseAutomaticCache && routeInfos && (routeInfos.mustEnableAutomaticCache===true);

        this.mainCache = this.cache;
        this._headers = this.coreRequest.headers;
    }

    //region Properties

    private _customData?: any;

    get urlInfos(): URL {
        if (!this._urlInfos) {
            this._urlInfos = new URL(this.coreRequest.url);
            this._urlInfos.hash = "";
        }

        return this._urlInfos;
    }

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
     *
     * - The url parts.
     * - The search param (query string).
     * - The POST/PUT data if available.
     */
    async getReqData<T>(options?: {ignoreUrl?: boolean, dataSchema?: jk_schema.Schema}): Promise<T> {
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

        if (options && options.dataSchema) {
            this.validateDataSchema(res, options.dataSchema);
        }

        return res as T;
    }

    /**
     * Get the request body and decode it properly.
     */
    async getBodyData<T>(options?: {dataSchema?: jk_schema.Schema}): Promise<T> {
        let res: any = {};

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

        if (options && options.dataSchema) {
            this.validateDataSchema(res, options.dataSchema);
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
     * Validate the data Schema.
     * If invalid, throw a special exception allowing
     * to directly send a response to the caller.
     */
    validateDataSchema(data: any, schema: jk_schema.Schema) {
        let error = jk_schema.validateSchema(data, schema);

        if (error) {
            throw new SBPE_DirectSendThisResponseException(() => {
                return this.returnError400_BadRequest("Invalid data")
            });
        }
    }

    async reqBodyAsJson<T = any>(dataSchema?: jk_schema.Schema): Promise<T> {
        if (dataSchema) {
            const data = await this.reqBodyAsJson();
            this.validateDataSchema(data, dataSchema);
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

    redirectResponse(permanent: boolean = false, url?: string | URL): Response {
        if (!url) url = this.urlInfos;
        return new Response(null, {status: permanent ? 301 : 302, headers: {"location": url.toString()}});
    }

    textResponse(text: string, statusCode: number = 200) {
        return new Response(text, {status: statusCode, headers: {"content-type": "text/plain;charset=utf-8"}});
    }

    returnResultMessage(isOk: true, message?: string): Response {
        return this.jsonResponse({isOk, message});
    }

    htmlResponse(html: string, statusCode: number = 200): Response {
        return new Response(html, {status: statusCode, headers: {"content-type": "text/html;charset=utf-8"}});
    }

    jsonResponse(json: any, statusCode: number = 200): Response {
        return new Response(JSON.stringify(json), {
            status: statusCode,
            headers: {"content-type": "application/json;charset=utf-8"}
        });
    }

    jsonStringResponse(json: string, statusCode: number = 200): Response {
        return new Response(json, {status: statusCode, headers: {"content-type": "application/json;charset=utf-8"}});
    }

    returnError404_NotFound(): Promise<Response> {
        return this.webSite.return404(this);
    }

    returnError500_ServerError(error?: any | string): Promise<Response> {
        return this.webSite.return500(this, error);
    }

    returnError401_Unauthorized(error?: Error | string): Promise<Response> {
        return this.webSite.return401(this, error);
    }

    returnError400_BadRequest(error?: Error | string): Promise<Response> {
        return Promise.resolve(new Response(error ? error.toString() : "Bad request", {status: 400}));
    }

    //endregion

    //region Fetch / Proxy

    directProxyToServer(): Promise<Response> {
        return (this.webSite as WebSiteImpl).loadBalancer.directProxy(this);
    }

    proxyRequestTo(server: ServerFetch<any>): Promise<Response> {
        return server.directProxy(this);
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
            if (isNodeJS) {
                let headers = new Headers(res.headers);
                headers.delete("content-length");
                headers.delete("content-encoding");

                let newHTML = await this.applyTextModifiers(res, hooks);
                return new Response(newHTML, {status: res.status, headers});
            }
            else {
                res.headers.delete("content-length");
                res.headers.delete("content-encoding");

                return new Response(
                    await this.applyTextModifiers(res, hooks),
                    {status: res.status, headers: res.headers}
                );
            }
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
        const headerColor = jk_term.buildWriter(jk_term.C_RED);
        const titleColor = jk_term.buildWriter(jk_term.C_ORANGE);

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

    //region Post process

    private postProcess: ((res: Response) => Response)[] | undefined;

    applyPostProcess(res: Response): Response {
        if (!this.postProcess) return res;
        this.postProcess.forEach(hook => res = hook(res));
        return res;
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

    addCookie(cookieName: string, cookieValue: string, options?: CookieOptions) {
        let cookie = `${cookieName}=${cookieValue};`;

        if (options) {
            if (options.maxAge) {
                cookie += ` Max-Age=${options.maxAge};`;
            }
        }

        if (!this.postProcess) this.postProcess = [];

        this.postProcess.push((res: Response) => {
            let current = res.headers.get("set-cookie");
            if (current) cookie = current + cookie;

            // With node, res.headers is immutable.
            // And a Response object is also immutable.
            // It's why we need to create a new response.
            //
            if (jk_what.isNodeJS) {
                const headers = new Headers(res.headers);
                headers.append("set-cookie", cookie);

                res = new Response(res.body, {
                    headers: headers,
                    status: res.status
                });
            } else {
                res.headers.append("set-cookie", cookie);
            }

            return res;
        });
    }

    //endregion

    //region ReactJS

    /**
     * Allow rendering a document fully formed from a React component.
     */
    reactResponse(E: ReactNode) {
        return this.htmlResponse(ReactServer.renderToStaticMarkup(E));
    }

    reactToString(element: ReactNode): string {
        return ReactServer.renderToStaticMarkup(element);
    }

    /**
     * The new render function.
     * Used while refactoring the renderer.
     * Used while refactoring the renderer.
     */
    async reactPage(pageKey: string, C: React.FC<any>): Promise<Response> {
        try {
            // What we will include in our HTML.
            const options = {
                head: [<link key="jopi.mainBundle" rel="stylesheet" type="text/css" href={"/_bundle/" + pageKey + ".css"} />],
                bodyEnd: [<script key="jopi.mainSript" type="module" src={"/_bundle/" + pageKey + ".js"}></script>]
            };

            // Allow faking the environment of the page.
            const controller = new PageController_ExposePrivate<unknown>(
                false, (this.webSite as WebSiteImpl).mustRemoveTrailingSlashs, options);

            controller.setServerRequest(this);
            (this.webSite as WebSiteImpl).executeBrowserInstall(controller);

            const params = this.urlParts;
            const searchParams = this.urlInfos.searchParams;

            const html = ReactServer.renderToStaticMarkup(<Page controller={controller} ><C params={params} searchParams={searchParams}/></Page>);
            return new Response(html, {status: 200, headers: {"content-type": "text/html;charset=utf-8"}});
        }
        catch (e: any) {
            console.error(e);
            return await this.returnError500_ServerError(e);
        }
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

            (this.webSite as WebSiteImpl).storeJwtToken(this);

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
        if (!userInfos) throw new SBPE_NotAuthorizedException();
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
            throw new SBPE_NotAuthorizedException();
        }
    }

    //endregion

    filterSearchParams(filter?: SearchParamFilterFunction) {
        if (filter) {
            filter(this.urlInfos);
        } else {
            if (this.routeInfos.searchParamFilter) {
                this.routeInfos.searchParamFilter(this.urlInfos);
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
        const stats = await jk_fs.getFileStat(filePath);

        if (stats && stats.isFile()) {
            let contentType = jk_fs.getMimeTypeFromName(filePath);
            const contentLength = stats.size;

            const headers: any = {
                "content-type": contentType,
                "content-length": contentLength.toString()
            };

            return jk_fs.createResponseFromFile(filePath, 200, headers);
        }

        return undefined;
    }

    /**
     * Allow serving a file as a response.
     * Automatically get the file from the url and a root dir.
     */
    async serveFromDir(filesRootPath: string, options?: ServeFileOptions): Promise<Response> {
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