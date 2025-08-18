import { type RouterContext } from "rou3";
import { ServerFetch } from "./serverFetch.ts";
import type { SearchParamFilterFunction } from "./searchParamFilter.ts";
import { type ReactNode } from "react";
import { LoadBalancer } from "./loadBalancing.ts";
import { type ServerInstance, type ServerSocketAddress, type StartServerCoreOptions } from "./server.ts";
export type JopiRouter = RouterContext<WebSiteRoute>;
export type JopiRouteHandler = (req: JopiRequest) => Response | Promise<Response>;
export type JopiErrorHandler = (req: JopiRequest, error?: Error | string) => Response | Promise<Response>;
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
export type RequestBody = ReadableStream<Uint8Array> | null;
export type SendingBody = ReadableStream<Uint8Array> | string | FormData | null;
export type ResponseModifier = (res: Response, req: JopiRequest) => Response | Promise<Response>;
export type TextModifier = (text: string, req: JopiRequest) => string | Promise<string>;
export type TestCookieValue = (value: string) => boolean | Promise<boolean>;
export declare class NotAuthorizedException extends Error {
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
export declare class JopiRequest {
    readonly webSite: WebSite;
    readonly urlInfos: URL;
    coreRequest: Request;
    readonly coreServer: ServerInstance;
    readonly route: WebSiteRoute;
    cache: PageCache;
    readonly mainCache: PageCache;
    private cookies?;
    private _headers;
    constructor(webSite: WebSite, urlInfos: URL, coreRequest: Request, coreServer: ServerInstance, route: WebSiteRoute);
    private _customData?;
    get customData(): any;
    /**
     * Return the verb used for the request (GET, POST, PUT, DELETE, ...)
     */
    get method(): HttpMethod;
    /**
     * Return the content type of the request.
     */
    get reqContentType(): string | null;
    get url(): string;
    get body(): RequestBody;
    get headers(): Headers;
    set headers(value: Headers);
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
    get urlSearchParams(): any;
    /**
     * Returns information on the caller IP.
     */
    get requestIP(): ServerSocketAddress | null;
    get isFromLocalhost(): boolean;
    /**
     * Returns all the data about the request.
     * It's concat all data source.
     * - The url parts.
     * - The search param (query string).
     * - The POST/PUT data if available.
     */
    getReqData<T>(ignoreUrl?: boolean): Promise<T>;
    /**
     * Returns all the data about the request, organized by category.
     */
    getReqDataInfos(): Promise<any>;
    /**
     * https://developer.mozilla.org/en-US/docs/Web/API/Request/bodyUsed
     */
    get isReqBodyUsed(): boolean;
    get isReqBodyJson(): boolean;
    get isReqBodyFormData(): boolean;
    get isReqBodyXFormUrlEncoded(): boolean;
    /**
     * https://developer.mozilla.org/en-US/docs/Web/API/Request/text
     */
    reqBodyAsText(): Promise<string>;
    /**
     * https://developer.mozilla.org/en-US/docs/Web/API/Request/json
     */
    reqBodyAsJson<T>(): Promise<T>;
    /**
     * https://developer.mozilla.org/en-US/docs/Web/API/Request/arrayBuffer
     */
    reqBodyAsArrayBuffer(): Promise<ArrayBuffer>;
    /**
     * https://developer.mozilla.org/en-US/docs/Web/API/Request/blob
     */
    reqBodyAsBlob(): Promise<Blob>;
    /**
     * https://developer.mozilla.org/en-US/docs/Web/API/Request/bytes
     */
    reqBodyAsBytes(): Promise<Uint8Array>;
    /**
     * https://developer.mozilla.org/en-US/docs/Web/API/Request/formData
     */
    reqBodyAsFormData(): Promise<FormData>;
    /**
     * When DDOS protection is enabled, the request has a timeout of 60 seconds.
     * Here it'd allow you to extend this time for a request you knew was slow.
     */
    extendTimeout_sec(sec: number): void;
    redirectResponse(permanent?: boolean, url?: string | URL): Response;
    textResponse(text: string, statusCode?: number): Response;
    htmlResponse(html: string, statusCode?: number): Response;
    jsonResponse(json: any, statusCode?: number): Response;
    jsonStringResponse(json: string, statusCode?: number): Response;
    error404Response(): Response | Promise<Response>;
    error500Response(error?: Error | string): Response | Promise<Response>;
    directProxyToServer(): Promise<Response>;
    directProxyWith(server: ServerFetch<any>): Promise<Response>;
    fetchServer(headers?: Headers, method?: string, url?: URL, body?: RequestBody): Promise<Response>;
    /**
     * Get from the cache the entry corresponding to the curent url.
     *
     * @param useGzippedVersion
     *      If true, returns the compressed version in priority.
     *      If it doesn't exist, then will return the uncompressed version.
     * @param metaUpdater
     *      Allow updating the meta of the cache entry.
     */
    getFromCache(useGzippedVersion?: boolean, metaUpdater?: MetaUpdater<unknown>): Promise<Response | undefined>;
    hasInCache(useGzippedVersion?: boolean | undefined): Promise<boolean>;
    removeFromCache(url?: URL): Promise<void>;
    addToCache_Compressed(response: Response, metaUpdater?: MetaUpdater<unknown>): Promise<Response>;
    addToCache_Uncompressed(response: Response, metaUpdater?: MetaUpdater<unknown>): Promise<Response>;
    /**
     * Allow using a sub-cache.
     * For example, a cache dedicated per user.
     */
    useCache(cache: PageCache): void;
    getSubCache(name: string): PageCache;
    getContentTypeCategory(response: Response): ContentTypeCategory;
    isHtml(response: Response): boolean;
    isCss(response: Response): boolean;
    isJavascript(response: Response): boolean;
    isJson(response: Response): boolean;
    isXFormUrlEncoded(response: Response): boolean;
    hookIfHtml(res: Response, ...hooks: TextModifier[]): Promise<Response>;
    hookIfCss(res: Response, ...hooks: TextModifier[]): Promise<Response>;
    hookIfJavascript(res: Response, ...hooks: TextModifier[]): Promise<Response>;
    applyTextModifiers(res: Response, hooks: TextModifier[]): Promise<string>;
    executeModifiers(res: Response, hooks: ResponseModifier[]): Promise<Response>;
    duplicateReadableStream(stream: ReadableStream | null): Promise<(ReadableStream<any> | null)[]>;
    duplicateRawRequest(raw: Request): Promise<[Request, Request]>;
    duplicateResponse(raw: Response): Promise<[Response, Response]>;
    spyRequest(handleRequest: (req: JopiRequest) => Response | Promise<Response>): Promise<Response>;
    printSpyRequestData(data: JopiRequestSpyData): Promise<void>;
    spyRequestData(handleRequest: JopiRouteHandler, onSpy: JopiRequestSpy): Promise<Response>;
    hasCookie(name: string, value?: string): boolean;
    getCookie(name: string): string | undefined;
    hookIfCookie(res: Response, name: string, testCookieValue: null | undefined | TestCookieValue, ...hooks: TextModifier[]): Promise<Response>;
    addCookie(res: Response, cookieName: string, cookieValue: string, options?: CookieOptions): void;
    reactResponse(element: ReactNode): Response;
    reactToString(element: ReactNode): string;
    asJquery(html: string): cheerio.Root;
    $(html: string): cheerio.Root;
    private postProcessHtml;
    /**
     * Create a JWT token with the data.
     */
    createJwtToken(data: UserInfos): string | undefined;
    /**
     * Extract the JWT token from the Authorization header.
     */
    getJwtToken(): string | undefined;
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
    tryAuthWithJWT(loginInfo: any): Promise<AuthResult>;
    /**
     * Verify and decode the JWT token.
     * Once done, the data is saved and can be read through req.userTokenData.
     */
    private decodeJwtToken;
    getUserInfos(): UserInfos | undefined;
    private hasNoUserInfos;
    private userInfos?;
    private userJwtToken?;
    /**
     * Returns the roles of the user.
     */
    getUserRoles(): string[];
    /**
     * Check if the user has all these roles.
     * Return true if ok, false otherwise.
     */
    userHasRoles(...requiredRoles: string[]): boolean;
    assertUserHasRoles(...requiredRoles: string[]): void;
    filterSearchParams(filter: SearchParamFilterFunction): void;
    getContentTypeOf(response: Response): string | null;
    /**
     * Allow serving a file as a response.
     */
    serveFile(filesRootPath: string, options?: ServeFileOptions): Promise<Response>;
}
export interface JopiRequestSpyData {
    method: string;
    reqUrl: string;
    reqReferer: string | null;
    reqContentType: string | null;
    reqData: any;
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
export interface ServeFileOptions {
    replaceIndexHtml?: boolean;
    /**
     * If the request file is not found, then call this function.
     * If undefined, then will directly return a 404 error.
     */
    onNotFound?: (req: JopiRequest) => Response | Promise<Response>;
}
export declare class WebSiteOptions {
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
export declare class WebSite {
    readonly port: number;
    readonly hostName: string;
    readonly welcomeUrl: string;
    readonly isHttps?: boolean;
    readonly certificate?: SslCertificatePath;
    readonly mainCache: PageCache;
    private readonly router;
    private _onNotFound?;
    private _on404?;
    private _on500?;
    private headersToCache;
    private middlewares?;
    private postMiddlewares?;
    private JWT_SECRET?;
    private jwtSigInOptions?;
    private authHandler?;
    private jwtTokenStore?;
    readonly data: any;
    readonly loadBalancer: LoadBalancer;
    constructor(url: string, options?: WebSiteOptions);
    addRoute(method: HttpMethod, path: string, handler: JopiRouteHandler): WebSiteRoute;
    addSharedRoute(method: HttpMethod, allPath: string[], handler: JopiRouteHandler): WebSiteRoute;
    getWebSiteRoute(method: string, url: string): WebSiteRoute | undefined;
    onGET(path: string | string[], handler: JopiRouteHandler): WebSiteRoute;
    onPOST(path: string | string[], handler: JopiRouteHandler): WebSiteRoute;
    onPUT(path: string | string[], handler: JopiRouteHandler): WebSiteRoute;
    onDELETE(path: string | string[], handler: JopiRouteHandler): WebSiteRoute;
    onPATCH(path: string | string[], handler: JopiRouteHandler): WebSiteRoute;
    onHEAD(path: string | string[], handler: JopiRouteHandler): WebSiteRoute;
    onOPTIONS(path: string | string[], handler: JopiRouteHandler): WebSiteRoute;
    onNotFound(handler: JopiRouteHandler): void;
    on404(handler: JopiRouteHandler): void;
    on500(handler: JopiRouteHandler): void;
    getRouteFor(url: string, method?: string): WebSiteRoute | undefined;
    processRequest(urlInfos: URL, bunRequest: Request, bunServer: ServerInstance): Response | Promise<Response>;
    return404(req: JopiRequest): Response | Promise<Response>;
    return500(req: JopiRequest, error?: Error | string): Response | Promise<Response>;
    onServerStarted(): void;
    getHeadersToCache(): string[];
    addHeaderToCache(header: string): void;
    addMiddleware(middleware: JopiMiddleware): void;
    addPostMiddleware(middleware: JopiPostMiddleware): void;
    addSourceServer<T>(serverFetch: ServerFetch<T>, weight?: number): void;
    enableCors(allows?: string[]): void;
    /**
     * Create a JWT token with the data.
     */
    createJwtToken(data: UserInfos): string | undefined;
    /**
     * Verify and decode the JWT token.
     * Returns the data this token contains, or undefined if the token is invalid.
     */
    decodeJwtToken(token: string): UserInfos | undefined;
    setJwtSecret(secret: string): void;
    tryAuthUser(loginInfo: any): Promise<AuthResult>;
    setAuthHandler<T>(authHandler: AuthHandler<T>): void;
    private ifRouteNotFound;
    storeJwtToken(req: JopiRequest, res: Response): void;
    /**
     * Allow hooking how the JWT token is stored in the user response.
     */
    setJwtTokenStore(store: JwtTokenStore): void;
    private applyMiddlewares;
    createHttpDirectWebsite(): WebSite;
}
export type AuthHandler<T> = (loginInfo: T) => AuthResult | Promise<AuthResult>;
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
export declare class ServerAlreadyStartedError extends Error {
    constructor();
}
export declare class JopiServer {
    private readonly webSites;
    private readonly servers;
    private _isStarted;
    addWebsite(webSite: WebSite): WebSite;
    stopServer(): Promise<void>;
    startServer(): void;
    /**
     * Generate a certificat for dev test.
     * Require "mkcert" to be installed.
     * See: https://github.com/FiloSottile/mkcert
     */
    createDevCertificate(hostName: string): Promise<SslCertificatePath>;
}
export declare function getServerStartOptions(): StartServerCoreOptions;
/**
 * Update the meta-data.
 * Return true if a change has been done, false otherwise.
 */
export interface MetaUpdater<T> {
    updateMeta(meta: any | undefined, data: T): MetaUpdaterResult;
    requireCurrentMeta?: boolean;
    data?: T;
}
export declare enum MetaUpdaterResult {
    IS_NOT_UPDATED = 0,
    IS_UPDATED = 1,
    MUST_DELETE = 2
}
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
export declare class WebSiteMirrorCache implements PageCache {
    readonly rootDir: string;
    constructor(rootDir: string);
    private calKey;
    private calcFilePath;
    addToCache(url: URL, response: Response): Promise<Response>;
    removeFromCache(url: URL): Promise<void>;
    hasInCache(url: URL): Promise<boolean>;
    getFromCache(url: URL): Promise<Response | undefined>;
    getMeta<T>(url: URL): Promise<T | undefined>;
    createSubCache(name: string): PageCache;
}
export declare class VoidPageCache implements PageCache {
    getFromCache(): Promise<Response | undefined>;
    addToCache(_url: URL, response: Response): Promise<Response>;
    hasInCache(): Promise<boolean>;
    removeFromCache(_url: URL): Promise<void>;
    getMeta<T>(_url: URL): Promise<T | undefined>;
    createSubCache(): PageCache;
}
export interface CacheEntry {
    binary?: ArrayBuffer;
    binarySize?: number;
    isGzipped?: boolean;
    headers?: {
        [key: string]: string;
    };
    meta?: any;
    status?: number;
    _refCount?: number;
    _refCountSinceGC?: number;
}
export declare enum ContentTypeCategory {
    OTHER = 0,
    _TEXT_ = 10,
    TEXT_HTML = 11,
    TEXT_CSS = 12,
    TEXT_JAVASCRIPT = 13,
    TEXT_JSON = 14,
    _FORM_ = 20,
    FORM_MULTIPART = 20,
    FORM_URL_ENCODED = 21,
    _BINARY_ = 30,
    IMAGE = 31
}
export declare function parseCookies(headers: Headers): {
    [name: string]: string;
};
export declare function readContentLength(headers: Headers): number;
export declare function cacheEntryToResponse(entry: CacheEntry): Response;
export declare function responseToCacheEntry(response: Response, headersToInclude: string[] | undefined, meta: any, isGzipped: boolean): CacheEntry;
export declare function addHeaderIfExist(headers: {
    [key: string]: string;
}, headerName: string, source: Headers): void;
export declare function octetToMo(size: number): number;
export declare const ONE_KILO_OCTET = 1024;
export declare const ONE_MEGA_OCTET: number;
