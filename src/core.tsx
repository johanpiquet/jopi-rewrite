// noinspection JSUnusedGlobalSymbols

import * as path from "node:path";
import {addRoute, createRouter, findRoute, type RouterContext} from "rou3";
import {ServerFetch} from "./serverFetch.ts";
import type {SearchParamFilterFunction} from "./searchParamFilter.ts";
import * as ReactServer from 'react-dom/server';
import React, {type ReactNode} from "react";
import {Page, PageController} from "jopi-rewrite-ui";

import {
    createBundle,
    getBundleUrl,
    handleBundleRequest,
    hasHydrateComponents,
    hasExternalCssBundled
} from "./hydrate.tsx";

import * as cheerio from "cheerio";
import {LoadBalancer} from "./loadBalancing.ts";
import fs from "node:fs/promises";
// noinspection ES6PreferShortImport
import {PostMiddlewares} from "./middlewares/index.ts";
import * as jwt from 'jsonwebtoken';
import serverImpl, {
    type ServerInstance,
    type ServerSocketAddress,
    type StartServerCoreOptions,
    type StartServerOptions, type WebSocketConnectionInfos
} from "./server.ts";

const nFS = NodeSpace.fs;
const nOS = NodeSpace.os;
const nSocket = NodeSpace.webSocket;

const ONE_DAY = NodeSpace.timer.ONE_DAY;

export type JopiRouteHandler = (req: JopiRequest) => Promise<Response>;
export type JopiWsRouteHandler = (ws: JopiWebSocket, infos: WebSocketConnectionInfos) => Promise<void>;
export type JopiErrorHandler = (req: JopiRequest, error?: Error|string) => Response|Promise<Response>;
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
export type RequestBody = ReadableStream<Uint8Array> | null;
export type SendingBody = ReadableStream<Uint8Array> | string | FormData | null;

type WebSiteMap = {[hostname: string]: WebSite};

export type ResponseModifier = (res: Response, req: JopiRequest) => Response|Promise<Response>;
export type TextModifier = (text: string, req: JopiRequest) => string|Promise<string>;
export type TestCookieValue = (value: string) => boolean|Promise<boolean>;

export class NotAuthorizedException extends Error {
}

export interface CookieOptions {
    maxAge?: number;
}

export interface UserInfos {
    id: string;

    roles?: string[];
    email?: string;

    fullName?: string;
    nickName?: string;

    firstName?: string;
    lastName?: string;

    avatarUrl?: string;

    [key: string]: any;
}

export interface AuthResult {
    isOk: boolean;
    errorMessage?: string;
    authToken?: string;
    userInfos?: UserInfos;
}

export type JwtTokenStore = (jwtToken: string, cookieValue: string, req: JopiRequest, res: Response) => void;

export class JopiRequest {
    public cache: PageCache;
    public readonly mainCache: PageCache;
    private cookies?: {[name: string]: string};
    private _headers: Headers;

    constructor(public readonly webSite: WebSite,
                public readonly urlInfos: URL,
                public coreRequest: Request,
                public readonly coreServer: ServerInstance,
                public readonly route: WebSiteRoute)
    {
        this.cache = webSite.mainCache;
        this.mainCache = webSite.mainCache;
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
    get reqContentType(): string|null {
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
     * and route http://mywebsite/{productName}/list
     * then urlParts contains {productName: "product-name"}
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
    get requestIP(): ServerSocketAddress|null {
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
    async getReqData<T>(ignoreUrl=false): Promise<T> {
        let res: any = {};

        if (!ignoreUrl) {
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
            searchParams.forEach((value, key) =>t[key] = value);
        }

        if (this.urlParts) {
            res.urlParts = {...this.urlParts};
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
                const t: any = res.formData = {};
                const asFormData = await this.reqBodyAsFormData();
                asFormData.forEach((value, key) => t[key] = value);
            }
            catch {
                // If FormData is invalid.
            }
        } else if (this.isReqBodyXFormUrlEncoded) {
            try {
                let data = await this.reqBodyAsText();
                const t: any = res.formUrlEncoded = {};
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
    get isReqBodyUsed(): boolean {
        return this.coreRequest.bodyUsed;
    }

    get isReqBodyJson(): boolean {
        const ct = this.reqContentType;
        if (ct===null) return false;
        return ct.startsWith("application/json");
    }

    get isReqBodyFormData(): boolean {
        const ct = this.reqContentType;
        if (ct===null) return false;
        return ct.startsWith("multipart/form-data");
    }

    get isReqBodyXFormUrlEncoded(): boolean {
        const ct = this.reqContentType;
        if (ct===null) return false;
        return ct.startsWith("application/x-www-form-urlencoded");
    }

    /**
     * https://developer.mozilla.org/en-US/docs/Web/API/Request/text
     */
    reqBodyAsText(): Promise<string> {
        return this.coreRequest.text();
    }

    /**
     * https://developer.mozilla.org/en-US/docs/Web/API/Request/json
     */
    reqBodyAsJson<T>(): Promise<T> {
        return this.coreRequest.json() as Promise<T>;
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

    redirectResponse(permanent: boolean = false, url?: string|URL) {
        if (!url) url = this.urlInfos;
        return new Response(null, {status: permanent ? 301 : 302, headers:{"location": url.toString()}});
    }

    textResponse(text: string, statusCode: number = 200) {
        return new Response(text, {status: statusCode, headers:{"content-type": "text/plain;charset=utf-8"}});
    }

    htmlResponse(html: string, statusCode: number = 200) {
        html = this.postProcessHtml(html);
        return new Response(html, {status: statusCode, headers:{"content-type": "text/html;charset=utf-8"}});
    }

    jsonResponse(json: any, statusCode: number = 200) {
        return new Response(JSON.stringify(json), {status: statusCode, headers:{"content-type": "application/json;charset=utf-8"}});
    }

    jsonStringResponse(json: string, statusCode: number = 200) {
        return new Response(json, {status: statusCode, headers:{"content-type": "application/json;charset=utf-8"}});
    }

    error404Response(): Response|Promise<Response> {
        return this.webSite.return404(this);
    }

    error500Response(error?: Error|string): Response|Promise<Response> {
        return this.webSite.return500(this, error);
    }

    //endregion

    //region Fetch / Proxy

    directProxyToServer(): Promise<Response> {
        return this.webSite.loadBalancer.directProxy(this);
    }

    directProxyWith(server: ServerFetch<any>): Promise<Response> {
        return server.directProxy(this);
    }

    fetchServer(headers?: Headers, method: string="GET", url?: URL, body?: RequestBody): Promise<Response> {
        if (!url) url = this.urlInfos;
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
    async getFromCache(useGzippedVersion: boolean = true, metaUpdater?: MetaUpdater<unknown>): Promise<Response|undefined> {
        return await this.cache.getFromCache(this.urlInfos, useGzippedVersion, metaUpdater);
    }

    async hasInCache(useGzippedVersion?: boolean|undefined): Promise<boolean> {
        return await this.cache.hasInCache(this.urlInfos, useGzippedVersion);
    }

    removeFromCache(url?: URL): Promise<void> {
        // Avoid doublons.
        //
        if (!url) {
            url = this.urlInfos;
            url.hostname = url.hostname.toLowerCase();
            url.pathname = url.pathname.toLowerCase();
        }

        return this.cache.removeFromCache(url || this.urlInfos);
    }

    addToCache_Compressed(response: Response, metaUpdater?: MetaUpdater<unknown>): Promise<Response> {
        return this.cache.addToCache(this.urlInfos, response, this.webSite.getHeadersToCache(), false, metaUpdater);
    }

    addToCache_Uncompressed(response: Response, metaUpdater?: MetaUpdater<unknown>): Promise<Response> {
        return this.cache.addToCache(this.urlInfos, response, this.webSite.getHeadersToCache(), true, metaUpdater);
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
        if (contentType===null) return false;
        return contentType.startsWith("text/html");
    }

    isCss(response: Response): boolean {
        const contentType = response.headers.get("content-type");
        if (contentType===null) return false;
        return contentType.startsWith("text/css");
    }

    isJavascript(response: Response): boolean {
        const contentType = response.headers.get("content-type");
        if (contentType===null) return false;
        return contentType.startsWith("application/javascript") || contentType.startsWith("text/javascript");
    }

    isJson(response: Response): boolean {
        const contentType = response.headers.get("content-type");
        if (contentType===null) return false;
        return contentType.startsWith("application/json");
    }

    isXFormUrlEncoded(response: Response): boolean {
        const contentType = response.headers.get("content-type");
        if (contentType===null) return false;
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
        const term = NodeSpace.term;
        const headerColor = term.buildWriter(term.C_RED);
        const titleColor = term.buildWriter(term.C_ORANGE);

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
            res: ()=>spyRes,

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

    getCookie(name: string): string|undefined {
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

        res.headers.append("set-cookie", cookie);
    }
    //endregion

    //region ReactJS

    private isUsingReactPage = false;
    private isUsingReact = false;

    reactResponse(element: ReactNode) {
        this.isUsingReact = true;
        this.isUsingReactPage = true;

        // Add the CSS bundle to the head.
        // This will avoid content flicking.
        //
        const hook = (controller: PageController<unknown>) => {
            if (hasExternalCssBundled() || hasHydrateComponents()) {
                const bundleUrl = getBundleUrl(this.webSite);
                const hash = this.webSite.data["jopiLoaderHash"];
                controller.head.push(<link rel="stylesheet" key={hash.css} href={bundleUrl + "/loader.css?" + hash.css} />);
            }
        }

        return this.htmlResponse(ReactServer.renderToStaticMarkup(<Page hook={hook}>{element}</Page>));
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
    createJwtToken(data: UserInfos): string|undefined {
        return this.userJwtToken = this.webSite.createJwtToken(data);
    }

    /**
     * Extract the JWT token from the Authorization header.
     */
    getJwtToken(): string|undefined {
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
    async tryAuthWithJWT(loginInfo: any): Promise<AuthResult> {
        const authResult = await this.webSite.tryAuthUser(loginInfo);

        if (authResult.isOk) {
            if (!authResult.authToken) authResult.authToken = this.createJwtToken(authResult.userInfos!);

            // The token will be added to cookie "authorization" in the post-process step.
            this.userJwtToken = authResult.authToken;
            this.userInfos = authResult.userInfos!;

            return authResult;
        }

        this.userInfos = undefined;
        this.userJwtToken = undefined
        return authResult;
    }

    /**
     * Verify and decode the JWT token.
     * Once done, the data is saved and can be read through req.userTokenData.
     */
    private decodeJwtToken(): UserInfos|undefined {
        const token = this.getJwtToken();
        if (!token) return undefined;
        return this.webSite.decodeJwtToken(token);
    }

    public getUserInfos(): UserInfos|undefined {
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

    filterSearchParams(filter: SearchParamFilterFunction) {
        filter(this.urlInfos);
    }

    getContentTypeOf(response: Response): string|null {
        return response.headers.get("content-type");
    }

    /**
     * Allow serving a file as a response.
     */
    async serveFile(filesRootPath: string, options?: ServeFileOptions): Promise<Response> {
        options = options || gEmptyObject;

        if (options.replaceIndexHtml!==false) {
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

        return this.error404Response();
    }
}

export interface JopiRequestSpyData {
    method: string;

    reqUrl: string;
    reqReferer: string|null;
    reqContentType: string|null;
    reqData: any;

    // Allow avoiding printing the response content.
    res: (()=>Response)|undefined|null;

    resContentType: string|null;
    resContentTypeCat: ContentTypeCategory;

    resStatus: number;
    resLocation: string|null;
    resHeaders: Headers|undefined|null;

    reqCookies: string|null;
    resCookieSet: string[]|null;
}

export type JopiRequestSpy = (data: JopiRequestSpyData, req: JopiRequest) => void;

const gEmptyObject = {};

export interface ServeFileOptions {
    /*
        If true, then /index.html is replaced by / in the browser nav bar.
        Default is true.
     */
    replaceIndexHtml?: boolean;

    /**
     * If the request file is not found, then call this function.
     * If undefined, then will directly return a 404 error.
     */
    onNotFound?: (req: JopiRequest) => Response|Promise<Response>;
}

export class WebSiteOptions {
    /**
     * The TLS certificate to use;
     */
    certificate?: SslCertificatePath;

    /**
     * Allow defining our own cache for this website and don't use the common one.
     */
    cache?: PageCache;
}

export interface WebSiteRoute {
    handler: JopiRouteHandler;
    searchParamFilter?: SearchParamFilterFunction;
}

export class WebSite {
    readonly port: number;
    readonly hostName: string;
    readonly welcomeUrl: string;
    readonly isHttps?: boolean = false;

    certificate?: SslCertificatePath;
    readonly mainCache: PageCache;

    private readonly router: RouterContext<WebSiteRoute>;
    private readonly wsRouter: RouterContext<JopiWsRouteHandler>;
    private _onNotFound?: JopiRouteHandler;
    private _on404?: JopiRouteHandler;
    private _on500?: JopiErrorHandler;

    private headersToCache: string[] = ["content-type", "etag", "last-modified"];
    private middlewares?: JopiMiddleware[];
    private postMiddlewares?: JopiPostMiddleware[];

    private JWT_SECRET?: string;
    private jwtSignInOptions?: jwt.SignOptions;
    private authHandler?: AuthHandler<any>;
    private jwtTokenStore?: JwtTokenStore;

    public readonly data: any = {};

    public readonly loadBalancer = new LoadBalancer();

    constructor(url: string, options?: WebSiteOptions) {
        if (!options) options = {};

        url = url.trim().toLowerCase();

        this.welcomeUrl = url;
        this.certificate = options.certificate;

        const urlInfos = new URL(url);
        this.welcomeUrl = urlInfos.protocol + "//" + urlInfos.hostname;

        if (urlInfos.protocol === "https:") this.isHttps = true;
        else if (urlInfos.protocol!=="http:") throw new Error("invalid url");

        if (urlInfos.port) {
            this.port = parseInt(urlInfos.port);
            this.welcomeUrl += ':' + this.port;
        } else {
            if (this.isHttps) this.port = 443;
            else this.port = 80;
        }

        this.hostName = urlInfos.hostname;
        this.mainCache = options.cache || gVoidCache;
        this.router = createRouter<WebSiteRoute>();
        this.wsRouter = createRouter<JopiWsRouteHandler>();

        if (hasHydrateComponents() || hasExternalCssBundled()) {
            this.addRoute("GET", "/_bundle/*", handleBundleRequest);
        }
    }

    addRoute(method: HttpMethod, path: string, handler: JopiRouteHandler) {
        const webSiteRoute: WebSiteRoute = {handler};
        addRoute(this.router, method, path, webSiteRoute);
        return webSiteRoute;
    }

    addWsRoute(path: string, handler: JopiWsRouteHandler) {
        addRoute(this.wsRouter, "ws", path, handler);
    }

    addSharedRoute(method: HttpMethod, allPath: string[], handler: JopiRouteHandler) {
        const webSiteRoute: WebSiteRoute = {handler};
        allPath.forEach(path => addRoute(this.router, method, path, webSiteRoute));
        return webSiteRoute;
    }

    getWebSiteRoute(method:string, url: string): WebSiteRoute|undefined {
        const matched = findRoute(this.router!, method, url);
        if (!matched) return undefined;
        return matched.data;
    }

    onVerb(verb: HttpMethod, path: string|string[], handler: JopiRouteHandler): WebSiteRoute {
        handler = this.applyMiddlewares(handler);

        if (Array.isArray(path)) {
            return this.addSharedRoute("GET", path, handler);
        }

        return this.addRoute(verb, path, handler);
    }

    onGET(path: string|string[], handler: JopiRouteHandler): WebSiteRoute {
        return this.onVerb("GET", path, handler);
    }

    onPOST(path: string|string[], handler: JopiRouteHandler): WebSiteRoute {
        return this.onVerb("POST", path, handler);
    }

    onPUT(path: string|string[], handler: JopiRouteHandler): WebSiteRoute {
        return this.onVerb("PUT", path, handler);
    }

    onDELETE(path: string|string[], handler: JopiRouteHandler): WebSiteRoute {
        return this.onVerb("DELETE", path, handler);
    }

    onPATCH(path: string|string[], handler: JopiRouteHandler): WebSiteRoute {
        return this.onVerb("PATCH", path, handler);
    }

    onHEAD(path: string|string[], handler: JopiRouteHandler): WebSiteRoute {
        return this.onVerb("HEAD", path, handler);
    }

    onOPTIONS(path: string|string[], handler: JopiRouteHandler): WebSiteRoute {
        return this.onVerb("OPTIONS", path, handler);
    }

    onNotFound(handler: JopiRouteHandler) {
        this._onNotFound = handler;
    }

    on404(handler: JopiRouteHandler) {
        this._on404 = handler;
    }

    on500(handler: JopiRouteHandler) {
        this._on500 = handler;
    }

    getRouteFor(url: string, method: string = "GET"): WebSiteRoute|undefined {
        const matched = findRoute(this.router!, method, url);
        if (!matched) return undefined;
        return matched.data;
    }

    async processRequest(urlInfos: URL, bunRequest: Request, serverImpl: ServerInstance): Promise<Response> {
        // For security reason. Without that, an attacker can break a cache.
        urlInfos.hash = "";

        const matched = findRoute(this.router!, bunRequest.method, urlInfos.pathname);
        const req = new JopiRequest(this, urlInfos, bunRequest, serverImpl, (matched?.data)!);

        if (matched) {
            req.urlParts = matched.params;

            try {
                return await matched.data.handler(req);
            } catch (e) {
                if (e instanceof NotAuthorizedException) {
                    return req.textResponse(e.message, 401);
                }

                console.error(e);
                return this.return500(req, e as Error|string);
            }
        }

        // Doing this allows CORS options to be sent.
        if (req.method==="OPTIONS") {
            return req.htmlResponse("");
        }

        return this.ifRouteNotFound(req);
    }

    return404(req: JopiRequest): Response|Promise<Response> {
        if (this._on404) {
            return this._on404(req);
        }

        return new Response("", {status: 404});
    }

    return500(req: JopiRequest, error?: Error|string): Response|Promise<Response> {
        if (this._on500) {
            return this._on500(req, error);
        }

        return new Response("", {status: 404});
    }

    onServerStarted() {
        if (this.welcomeUrl) {
            console.log("Website started:", this.welcomeUrl);
        }
    }

    getHeadersToCache(): string[] {
        return this.headersToCache;
    }

    addHeaderToCache(header: string) {
        header = header.trim().toLowerCase();
        if (!this.headersToCache.includes(header)) this.headersToCache.push(header);
    }

    addMiddleware(middleware: JopiMiddleware) {
        if (!this.middlewares) this.middlewares = [];
        this.middlewares.push(middleware);
    }

    addPostMiddleware(middleware: JopiPostMiddleware) {
        if (!this.postMiddlewares) this.postMiddlewares = [];
        this.postMiddlewares.push(middleware);
    }

    addSourceServer<T>(serverFetch: ServerFetch<T>, weight?: number) {
        this.loadBalancer.addServer<T>(serverFetch, weight);
    }

    enableCors(allows?: string[]) {
        if (!allows) allows = [this.welcomeUrl];
        this.addPostMiddleware(PostMiddlewares.cors({accessControlAllowOrigin: allows}));
    }

    /**
     * Create a JWT token with the data.
     */
    createJwtToken(data: UserInfos): string|undefined {
        try {
            return jwt.sign(data as object, this.JWT_SECRET!, this.jwtSignInOptions);
        } catch (e) {
            return undefined;
        }
    }

    /**
     * Verify and decode the JWT token.
     * Returns the data this token contains, or undefined if the token is invalid.
     */
    decodeJwtToken(token: string): UserInfos|undefined {
        if (!this.JWT_SECRET) return undefined;

        try { return jwt.verify(token, this.JWT_SECRET) as UserInfos; }
        catch { return undefined; }
    }

    setJwtSecret(secret: string) {
        this.JWT_SECRET = secret;
    }

    async tryAuthUser(loginInfo: any): Promise<AuthResult> {
        if (this.authHandler) {
            const res = this.authHandler(loginInfo);
            if (res instanceof Promise) return await res;
            return res;
        }

        console.warn("Your JWT secret phrase isn't configured. Please use webSite.setJwtSecret to configure it.");
        return {isOk: false};
    }

    setAuthHandler<T>(authHandler: AuthHandler<T>) {
        this.authHandler = authHandler;
    }

    private ifRouteNotFound(req: JopiRequest) {
        if (this._onNotFound) {
            return this._onNotFound(req);
        }

        return this.return404(req);
    }

    public storeJwtToken(req: JopiRequest, res: Response) {
        const token = req.getJwtToken();

        if (this.jwtTokenStore) {
            this.jwtTokenStore(req.getJwtToken()!, "jwt " + token, req, res);
        } else {
            req.addCookie(res, "authorization", "jwt " + token, {maxAge: ONE_DAY * 7});
        }
    }

    /**
     * Allow hooking how the JWT token is stored in the user response.
     */
    public setJwtTokenStore(store: JwtTokenStore) {
        this.jwtTokenStore = store;
    }

    private applyMiddlewares(handler: JopiRouteHandler): JopiRouteHandler {
        return async function(req) {
            const mdw = req.webSite.middlewares;

            if (mdw) {
                const count = mdw.length;

                // Use a simple loop, which allow us to add/remove middleware at runtime.
                // For example, it allows enabling / disabling logging requests.
                //
                for (let i = 0; i < count; i++) {
                    const res = mdw[i](req);
                    if (res) return res;
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
        }
    }

    private http80WebSite?: WebSite;

    getOrCreateHttpRedirectWebsite(): WebSite {
        if (this.http80WebSite) return this.http80WebSite;
        if (this.port===80) return this;

        let urlInfos = new URL(this.welcomeUrl);
        urlInfos.port = "";
        urlInfos.protocol = "http";

        const webSite = new WebSite(urlInfos.href);
        this.http80WebSite = webSite;

        webSite.onGET("/**", async req => {
            req.urlInfos.port = "";
            req.urlInfos.protocol = "https";

            return req.redirectResponse(true, req.urlInfos.href);
        });

        return webSite;
    }

    _onRebuildCertificate?: () => void;

    updateSslCertificate(certificate: SslCertificatePath) {
        this.certificate = certificate;
        if (this._onRebuildCertificate) this._onRebuildCertificate();
    }

    async declareNewWebSocketConnection(jws: JopiWebSocket, infos: WebSocketConnectionInfos, urlInfos: URL) {
        const matched = findRoute(this.wsRouter, "ws", urlInfos.pathname);

        if (!matched) {
            jws.close();
            return;
        }

        await matched.data(jws, infos);
    }

    onWebSocketConnect(path: string, handler: JopiWsRouteHandler) {
        return this.addWsRoute(path, handler);
    }
}

export class JopiWebSocket {
    constructor(private readonly webSite: WebSite, private readonly server: ServerInstance, private readonly webSocket: WebSocket) {
    }

    close(): void {
        this.webSocket.close();
    }

    onMessage(listener: (msg: string|Buffer) => void): void {
        nSocket.onMessage(this.webSocket, listener);
    }

    sendTextMessage(text: string) {
        nSocket.sendTextMessage(this.webSocket, text);
    }
}

export type AuthHandler<T> = (loginInfo: T) => AuthResult|Promise<AuthResult>;

export interface WithRoles {
    roles?: string[];
}

export type JopiMiddleware = (req: JopiRequest) => Response | Promise<Response> | null;
export type JopiPostMiddleware = (req: JopiRequest, res: Response) => Response | Promise<Response>;
export type JopiMiddlewareBuilder<T> = (options?: T) => JopiMiddleware;

export interface SslCertificatePath {
    key: string;
    cert: string;
}

export class ServerAlreadyStartedError extends Error {
    constructor() {
        super("the server is already");
    }
}

export class JopiServer {
    private readonly webSites: WebSiteMap = {};
    private readonly servers: ServerInstance[] = [];
    private _isStarted = false;

    addWebsite(webSite: WebSite): WebSite {
        if (this._isStarted) throw new ServerAlreadyStartedError();
        this.webSites[webSite.hostName] = webSite;
        return webSite;
    }

    async stopServer(): Promise<void> {
        if (!this._isStarted) return;
        await Promise.all(this.servers.map(server => server.stop(false)));
    }

    startServer() {
        if (this._isStarted) return;
        this._isStarted = true;

        /**
         * Allow avoiding a bug where returning an array with only one certificate throws an error.
         */
        function selectCertificate(certificates: any[]): any|any[]|undefined {
            if (certificates.length===0) return undefined;
            if (certificates.length===1) return certificates[0];
            return certificates;
        }

        // Create hydrate bundle.
        Object.values(this.webSites).forEach(webSite => createBundle(webSite));

        const byPorts: { [port: number]: WebSiteMap } = {};

        Object.values(this.webSites).forEach(e => {
            if (!byPorts[e.port]) byPorts[e.port] = {};
            byPorts[e.port][e.hostName] = e;
        });

        for (let port in byPorts) {
            function rebuildCertificates() {
                certificates = [];

                Object.values(hostNameMap).forEach(webSite => {
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

            const hostNameMap = byPorts[port]!;
            let certificates: any[] = [];

            rebuildCertificates();

            Object.values(hostNameMap).forEach(webSite => webSite._onRebuildCertificate = () => {
                rebuildCertificates();

                let certificate = selectCertificate(certificates);
                myServerOptions.tls = certificate;
                serverImpl.updateSslCertificate(myServerInstance, myServerOptions, certificate);
            });
            
            const myServerOptions: StartServerOptions = {
                ...gServerStartGlobalOptions,

                port,
                tls: selectCertificate(certificates),

                fetch: req => {
                    const urlInfos = new URL(req.url);
                    const webSite = hostNameMap[urlInfos.hostname];
                    if (!webSite) return new Response("", {status: 404});
                    return webSite.processRequest(urlInfos, req, myServerInstance);
                },

                async onWebSocketConnection(ws: WebSocket, infos: WebSocketConnectionInfos) {
                    const urlInfos = new URL(infos.url);
                    const webSite = hostNameMap[urlInfos.hostname];

                    if (!webSite) {
                        ws.close();
                        return;
                    }

                    const jws = new JopiWebSocket(webSite, myServerInstance, ws);
                    webSite.declareNewWebSocketConnection(jws, infos, urlInfos).catch();
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
    async createDevCertificate(hostName: string, certsDir: string = "certs"): Promise<SslCertificatePath>  {
        const sslDirPath = path.resolve(certsDir, hostName);
        const keyFilePath = path.join(sslDirPath, "certificate.key");
        const certFilePath = path.join(sslDirPath, "certificate.crt.key");

        if (!await nFS.isFile(certFilePath)) {
            await fs.mkdir(sslDirPath, {recursive: true});
            await nOS.exec(`cd ${sslDirPath}; mkcert -install; mkcert --cert-file certificate.crt.key --key-file certificate.key ${hostName} localhost 127.0.0.1 ::1`);
        }

        return {key: keyFilePath, cert: certFilePath};
    }
}

const gServerStartGlobalOptions: StartServerCoreOptions = {};

export function getServerStartOptions(): StartServerCoreOptions {
    return gServerStartGlobalOptions;
}

/**
 * Update the meta-data.
 * Return true if a change has been done, false otherwise.
 */
export interface MetaUpdater<T> {
    updateMeta(meta: any | undefined, data: T): MetaUpdaterResult;
    requireCurrentMeta?: boolean;
    data?: T;
}

export enum MetaUpdaterResult { IS_NOT_UPDATED, IS_UPDATED, MUST_DELETE}

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

    constructor(rootDir: string) {
        if (!rootDir) rootDir = ".";
        if (!path.isAbsolute(rootDir)) rootDir = path.resolve(process.cwd(), rootDir);
        this.rootDir = rootDir;
    }

    private calKey(url: URL): string {
        url = new URL(url);
        url.hostname = "localhost";
        url.port = "";
        url.protocol = "file:";

        const sURL = url.toString();
        return nFS.fileURLToPath(sURL);
    }

    private calcFilePath(url: URL): string {
        let fp = path.join(this.rootDir, this.calKey(url));

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

const gVoidCache = new VoidPageCache();

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

export enum ContentTypeCategory {
    OTHER,

    _TEXT_              = 10,
    TEXT_HTML           = 11,
    TEXT_CSS            = 12,
    TEXT_JAVASCRIPT     = 13,
    TEXT_JSON           = 14,

    _FORM_              = 20,
    FORM_MULTIPART      = 20,
    FORM_URL_ENCODED    = 21,

    _BINARY_            = 30,
    IMAGE
}

//region JQuery

/**
 * Add our own function to cheerio.
 * Note: the definition type has directly been added to cheerio.d.ts.
 */
function initCheerio($: cheerio.Root) {
    $.prototype.reactReplaceWith = function (this: cheerio.Cheerio, node: React.ReactElement): cheerio.Cheerio {
        // Note: "this: cheerio.Cheerio" allows casting the value of this.

        this.replaceWith(ReactServer.renderToStaticMarkup(node));
        return this;
    };

    $.prototype.reactReplaceContentWith = function (this: cheerio.Cheerio, node: React.ReactElement): cheerio.Cheerio {
        // Note: "this: cheerio.Cheerio" allows casting the value of this.

        return this.html(ReactServer.renderToStaticMarkup(node));
    };
}

//endregion

//region Tools

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

export function responseToCacheEntry(response: Response, headersToInclude: string[]|undefined, meta: any, isGzipped: boolean): CacheEntry {
    const status = response.status;
    const entry: CacheEntry = {meta, isGzipped, status};

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

export function octetToMo(size: number) {
    const res = size / ONE_MEGA_OCTET;
    return Math.trunc(res * 100) / 100;
}

export const ONE_KILO_OCTET = 1024;
export const ONE_MEGA_OCTET = 1024 * ONE_KILO_OCTET;

export const HTTP_VERBS: HttpMethod[] = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"];

//endregion