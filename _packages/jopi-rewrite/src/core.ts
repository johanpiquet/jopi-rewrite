// noinspection JSUnusedGlobalSymbols

import * as path from "node:path";
import {addRoute, createRouter, findRoute, type RouterContext} from "rou3";
import {ServerFetch} from "./serverFetch.ts";
import type {SearchParamFilterFunction} from "./searchParamFilter";
import * as ReactServer from 'react-dom/server';
import React, {type ReactNode} from "react";

import {createBundle, getBundleUrl, handleBundleRequest, hasHydrateComponents} from "./hydrate";
import * as cheerio from "cheerio";
import {LoadBalancer} from "./loadBalancing";
import fs from "node:fs/promises";
import {$} from "bun";
import {PostMiddlewares} from "./middlewares";
import * as jwt from 'jsonwebtoken';

const ONE_DAY = NodeSpace.timer.ONE_DAY;

export type JopiRouter = RouterContext<JopiRouteHandler>;
export type JopiRouteHandler = (req: JopiRequest) => Response|Promise<Response>;
export type JopiErrorHandler = (req: JopiRequest, error?: Error|string) => Response|Promise<Response>;
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
export type RequestBody = ReadableStream<Uint8Array> | null;
export type SendingBody = ReadableStream<Uint8Array> | string | FormData | null;

type WebSiteMap = {[hostname: string]: WebSite};

export type TextModifier = (text: string, req: JopiRequest) => string|Promise<string>;
export type TestCookieValue = (value: string) => boolean|Promise<boolean>;

export class NotAuthorizedException extends Error {
}

export interface CookieOptions {
    maxAge?: number;
}

export interface UserInfos {
    roles?: string[];

    id?: string;
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
    private cache: PageCache;
    private readonly mainCache: PageCache;
    private cookies?: {[name: string]: string};

    constructor(public readonly webSite: WebSite,
                public readonly urlInfos: URL,
                public readonly bunRequest: Request,
                public readonly bunServer: Bun.Server)
    {
        this.cache = webSite.mainCache;
        this.mainCache = webSite.mainCache;
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
        return this.bunRequest.method as HttpMethod;
    }

    /**
     * Return the content type of the request.
     */
    get reqContentType(): string|null {
        return this.bunRequest.headers.get("content-type");
    }

    get url(): string {
        return this.bunRequest.url;
    }

    get body(): RequestBody {
        return this.bunRequest.body;
    }

    get headers(): Headers {
        return this.bunRequest.headers;
    }

    /**
     * The part of the url.
     * if :                     https://mywebsite/product-name/list
     * and route                http://mywebsite/{productName}/list
     * then urlParts contains  {productName: "product-name"}
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
    get requestIP(): Bun.SocketAddress|null {
        return this.bunServer.requestIP(this.bunRequest);
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
     * https://developer.mozilla.org/en-US/docs/Web/API/Request/bodyUsed
     */
    get isReqBodyUsed(): boolean {
        return this.bunRequest.bodyUsed;
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

    /**
     * https://developer.mozilla.org/en-US/docs/Web/API/Request/text
     */
    reqBodyAsText(): Promise<string> {
        return this.bunRequest.text();
    }

    /**
     * https://developer.mozilla.org/en-US/docs/Web/API/Request/json
     */
    reqBodyAsJson<T>(): Promise<T> {
        return this.bunRequest.json() as Promise<T>;
    }

    /**
     * https://developer.mozilla.org/en-US/docs/Web/API/Request/arrayBuffer
     */
    reqBodyAsArrayBuffer(): Promise<ArrayBuffer> {
        return this.bunRequest.arrayBuffer();
    }

    /**
     * https://developer.mozilla.org/en-US/docs/Web/API/Request/blob
     */
    reqBodyAsBlob(): Promise<Blob> {
        return this.bunRequest.blob();
    }

    /**
     * https://developer.mozilla.org/en-US/docs/Web/API/Request/bytes
     */
    reqBodyAsBytes(): Promise<Uint8Array> {
        return this.bunRequest.bytes();
    }

    /**
     * https://developer.mozilla.org/en-US/docs/Web/API/Request/formData
     */
    reqBodyAsFormData(): Promise<FormData> {
        return this.bunRequest.formData();
    }

    //endregion

    //region Request timeout

    /**
     * When DDOS protection is enabled, the request has a timeout of 60 seconds.
     * Here it'd allow you to extend this time for request you known being slow.
     */
    extendTimeout_sec(sec: number) {
        this.bunServer.timeout(this.bunRequest, sec);
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

    fetchServer(method: string="GET", url?: URL, body?: RequestBody, headers?: Headers): Promise<Response> {
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
    async getFromCache(useGzippedVersion: boolean = true, metaUpdater?: MetaUpdater): Promise<Response|undefined> {
        let res = await this.cache.getFromCache(this.urlInfos, useGzippedVersion, metaUpdater);

        if (!res) {
            if (this.cache!==this.mainCache) {
                return await this.mainCache.getFromCache(this.urlInfos, useGzippedVersion);
            }
        }

        return res;
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

    addToCache_Compressed(response: Response, meta?: unknown, url?: URL): Promise<Response> {
        return this.cache.addToCache(url || this.urlInfos, response, this.webSite.getHeadersToCache(), false, meta);
    }

    addToCache_Uncompressed(response: Response, meta?: unknown, url?: URL): Promise<Response> {
        return this.cache.addToCache(url||this.urlInfos, response, this.webSite.getHeadersToCache(), true, meta);
    }

    async getCacheMeta<T>(url?: URL): Promise<T|undefined|null> {
        let res = await this.cache.getMeta<T>(url || this.urlInfos);

        if (!res) {
            if (this.cache!==this.mainCache) {
                return await this.cache.getMeta<T>(this.urlInfos);
            }
        }

        return res;
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

    isHtml(response: Response): boolean {
        const contentType = response.headers.get("content-type");
        if (contentType===null) return false;
        return contentType.startsWith("text/html");
    }

    isJson(response: Response): boolean {
        const contentType = response.headers.get("content-type");
        if (contentType===null) return false;
        return contentType.startsWith("application/json");
    }

    hookIfHtml(res: Response, ...hooks: TextModifier[]): Promise<Response> {
        if (this.isHtml(res)) {
            return this.hookHtml(res, hooks);
        }

        return Promise.resolve(res);
    }

    async hookHtml(res: Response, hooks: TextModifier[]): Promise<Response> {
        let text = await res.text() as string;

        for (const hook of hooks) {
            const res = hook(text, this);
            if (res instanceof Promise) text = await (res as Promise<string>);
            else text = res as string;
        }

        return this.htmlResponse(text);
    }

    //endregion

    //region Cookies

    hasCookie(name: string, value?: string): boolean {
        if (!this.cookies) this.cookies = parseCookies(this.bunRequest.headers);
        if (value) return this.cookies[name] === value;
        return this.cookies[name] !== undefined;
    }

    getCookie(name: string): string|undefined {
        if (!this.cookies) this.cookies = parseCookies(this.bunRequest.headers);
        return this.cookies[name];
    }

    hookIfCookie(res: Response, name: string, testCookieValue: null | undefined | TestCookieValue, ...hooks: TextModifier[]): Promise<Response> {
        const cookieValue = this.getCookie(name);

        if (cookieValue) {
            if (testCookieValue && !testCookieValue(cookieValue)) {
                return Promise.resolve(res);
            }

            return this.hookHtml(res, hooks);
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

    reactResponse(element: ReactNode) {
        return this.htmlResponse(ReactServer.renderToStaticMarkup(element));
    }

    reactToString(element: ReactNode): string {
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
        if (hasHydrateComponents()) {
            const bundleUrl = getBundleUrl(this.webSite);
            html += `\n<link rel="stylesheet" href="${bundleUrl}/loader.css" />`;
            html += `\n<script type="module" src="${bundleUrl}/loader.js"></script>`;
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
     * If signed in, then it automatically add the Authorization header.
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
    public userHasRoles(...requiredRoles: string[]): boolean {
        const userInfos = this.getUserInfos();
        if (!userInfos) return false;

        const userRoles = userInfos.roles;
        if (!userRoles) return false;

        for (let role of requiredRoles) {
            if (!userRoles.includes(role)) return false;
        }

        return true;
    }

    public assertUserHasRoles(...requiredRoles: string[]) {
        if (!this.userHasRoles(...requiredRoles)) {
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

const gEmptyObject = {};

export interface ServeFileOptions {
    /*
        If true, then /index.html is replaced by / in the browser nav bar.
        Default is true.
     */
    replaceIndexHtml?: boolean;

    /**
     * If the request file is not found, then call this function.
     * If undefined, then will directly returns a 404 error.
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

export class WebSite {
    readonly port: number;
    readonly hostName: string;
    readonly welcomeUrl: string;
    readonly isHttps?: boolean = false;

    readonly certificate?: SslCertificatePath;
    readonly mainCache: PageCache;

    private readonly router: JopiRouter;
    private _onNotFound?: JopiRouteHandler;
    private _on404?: JopiRouteHandler;
    private _on500?: JopiErrorHandler;

    private headersToCache: string[] = ["content-type", "etag", "last-modified"];
    private middlewares?: JopiMiddleware[];
    private postMiddlewares?: JopiPostMiddleware[];

    private JWT_SECRET?: string;
    private jwtSigInOptions?: jwt.SignOptions;
    private authHandler?: AuthHandler<any>;
    private jwtTokenStore?: JwtTokenStore;

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
        this.router = createRouter<JopiRouteHandler>();

        if (hasHydrateComponents()) {
            this.addRoute("GET", "/_bundle/*", handleBundleRequest);
        }
    }

    addRoute(method: HttpMethod, path: string, handler: JopiRouteHandler) {
        addRoute(this.router, method, path, handler)
    }

    onGET(path: string|string[], handler: JopiRouteHandler): WebSite {
        handler = this.applyMiddlewares(handler);

        if (Array.isArray(path)) {
            for (const p of path) this.addRoute("GET", p, handler);
            return this;
        }

        this.addRoute("GET", path, handler);
        return this;
    }

    onPOST(path: string|string[], handler: JopiRouteHandler): WebSite {
        handler = this.applyMiddlewares(handler);

        if (Array.isArray(path)) {
            for (const p of path) this.addRoute("POST", p, handler);
            return this;
        }

        this.addRoute("POST", path, handler);
        return this;
    }

    onPUT(path: string|string[], handler: JopiRouteHandler): WebSite {
        handler = this.applyMiddlewares(handler);

        if (Array.isArray(path)) {
            for (const p of path) this.addRoute("PUT", p, handler);
            return this;
        }

        this.addRoute("PUT", path, handler);
        return this;
    }

    onDELETE(path: string|string[], handler: JopiRouteHandler): WebSite {
        handler = this.applyMiddlewares(handler);

        if (Array.isArray(path)) {
            for (const p of path) this.addRoute("DELETE", p, handler);
            return this;
        }

        this.addRoute("DELETE", path, handler);
        return this;
    }

    onPATCH(path: string|string[], handler: JopiRouteHandler): WebSite {
        handler = this.applyMiddlewares(handler);

        if (Array.isArray(path)) {
            for (const p of path) this.addRoute("PATCH", p, handler);
            return this;
        }

        this.addRoute("PATCH", path, handler);
        return this;
    }

    onHEAD(path: string|string[], handler: JopiRouteHandler): WebSite {
        handler = this.applyMiddlewares(handler);

        if (Array.isArray(path)) {
            for (const p of path) this.addRoute("HEAD", p, handler);
            return this;
        }

        this.addRoute("HEAD", path, handler);
        return this;
    }

    onOPTIONS(path: string|string[], handler: JopiRouteHandler): WebSite {
        handler = this.applyMiddlewares(handler);

        if (Array.isArray(path)) {
            for (const p of path) this.addRoute("OPTIONS", p, handler);
            return this;
        }

        this.addRoute("OPTIONS", path, handler);
        return this;
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

    processRequest(urlInfos: URL, bunRequest: Request, bunServer: Bun.Server): Response|Promise<Response> {
        // For security reason. Without that, an attacker can break a cache.
        urlInfos.hash = "";

        const req = new JopiRequest(this, urlInfos, bunRequest, bunServer);
        const matched = findRoute(this.router!, bunRequest.method, urlInfos.pathname);

        if (matched) {
            req.urlParts = matched.params;

            try {
                return matched.data(req);
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
            return jwt.sign(data as object, this.JWT_SECRET!, this.jwtSigInOptions);
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
    private readonly servers: Bun.Server[] = [];
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
        function selectCertificate(certificates: any[]) {
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
            const hostNameMap = byPorts[port]!;
            const certificates: any[] = [];

            Object.values(hostNameMap).forEach(webSite => {
                if (webSite.certificate) {
                    const keyFile = path.resolve(webSite.certificate.key);
                    const certFile = path.resolve(webSite.certificate.cert);

                    certificates.push({
                        key: Bun.file(keyFile),
                        cert: Bun.file(certFile),
                        serverName: webSite.hostName
                    });
                }

                webSite.onServerStarted();
            });

            const myServerInstance: Bun.Server = Bun.serve({
                ...gServerStartGlobalOptions,

                port,
                tls: selectCertificate(certificates),

                fetch: req => {
                    const urlInfos = new URL(req.url);
                    const webSite = hostNameMap[urlInfos.hostname];
                    if (!webSite) return new Response("", {status: 404});
                    return webSite.processRequest(urlInfos, req, myServerInstance);
                }
            });

            this.servers.push(myServerInstance);
        }
    }

    /**
     * Generate a certificat for dev test.
     * Require mkcert to be installed.
     * See: https://github.com/FiloSottile/mkcert
     */
    async createDevCertificate(hostName: string): Promise<SslCertificatePath>  {
        const sslDirPath = path.resolve(path.join(process.cwd(), "certs", hostName));
        const keyFilePath = path.join(sslDirPath, "certificate.key");
        const certFilePath = path.join(sslDirPath, "certificate.crt.key");

        if (!await Bun.file(certFilePath).exists()) {
            await fs.mkdir(sslDirPath, {recursive: true});
            await $`cd ${sslDirPath}; mkcert -install; mkcert --cert-file certificate.crt.key --key-file certificate.key ${hostName} localhost 127.0.0.1 ::1`;
        }

        return {key: keyFilePath, cert: certFilePath};
    }
}

const gServerStartGlobalOptions: ServerStartOptions = {};

export function getServerStartOptions(): ServerStartOptions {
    return gServerStartGlobalOptions;
}

export interface ServerStartOptions {
    /**
     * The timeout value for a request.
     * See: https://bun.sh/reference/bun/Server/timeout
     */
    timeout?: number;
}

/**
 * Update the meta-data.
 * Return true if a change has been done, false otherwise.
 */
export type MetaUpdater = (meta: any|undefined) => MetaUpdaterResult;
export enum MetaUpdaterResult { IS_UPDATED, IS_NOT_UPDATED, MUST_DELETE}

export abstract class PageCache {
    getFromCache(_url: URL, _getGzippedVersion: boolean, _metaUpdater?: MetaUpdater): Promise<Response|undefined> {
        return Promise.resolve(undefined);
    }

    async addToCache(_url: URL, response: Response, _headersToInclude: string[]|undefined, _storeUncompressed: boolean, _meta: unknown): Promise<Response> {
        return Promise.resolve(response);
    }

    hasInCache(_url: URL, requireUncompressedVersion?: boolean|undefined): Promise<boolean> {
        return Promise.resolve(false);
    }

    removeFromCache(_url: URL): Promise<void> {
        // Nothing to do.
        return Promise.resolve();
    }

    /**
     * Returns the metadata for the cache entry.
     */
    getMeta<T>(_url: URL): Promise<T|undefined> {
        return Promise.resolve(undefined);
    }

    abstract createSubCache(name: string): PageCache;
}

export class WebSiteMirrorCache extends PageCache {
    public readonly rootDir: string;

    constructor(rootDir: string) {
        super();

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
        return Bun.fileURLToPath(sURL);
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

    override async addToCache(url: URL, response: Response): Promise<Response> {
        // We don't store 404 and others.
        if (response.status !== 200) return response;

        const filePath = this.calcFilePath(url);
        await fs.mkdir(path.dirname(filePath), {recursive: true});

        try {
            const file = Bun.file(filePath);
            await file.write(response);

            const headers: any = {
                "content-type": file.type,
                "content-length": file.size.toString()
            };

            return new Response(file, {status: 200, headers});
        }
        catch (e) {
            console.error(e);
            return new Response("", {status: 500});
        }
    }

    override async removeFromCache(url: URL): Promise<void> {
        const filePath = this.calcFilePath(url);
        await Bun.file(filePath).delete();
    }

    override async hasInCache(url: URL): Promise<boolean> {
        const filePath = this.calcFilePath(url);
        const file = Bun.file(filePath);

        try {
            const stat = await file.stat();
            return stat.isFile();
        }
        catch {
            return false;
        }
    }

    override async getFromCache(url: URL): Promise<Response|undefined> {
        const filePath = this.calcFilePath(url);
        const file = Bun.file(filePath);

        if (await file.exists()) {
            let contentType = file.type;
            const contentLength = file.size;

            const headers: any = {
                "content-type": contentType,
                "content-length": contentLength.toString()
            };

            return new Response(file, {status: 200, headers});
        }

        return undefined;
    }

    override async getMeta<T>(url: URL): Promise<T|undefined> {
        const filePath = this.calcFilePath(url);

        try {
            const text = await new Response(Bun.file(filePath + " meta")).text();
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

export class VoidPageCache extends PageCache {
    override createSubCache(_name: string): PageCache {
        return this;
    }
}

const gVoidCache = new VoidPageCache();

export interface CacheEntry {
    binary?: ArrayBuffer|Bun.BunFile|Uint8Array;
    binarySize?: number;
    isGzipped?: boolean;

    headers?: {[key:string]: string};

    meta?: any;
    status?: number;

    _refCount?: number;
    _refCountSinceGC?: number;
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

//endregion