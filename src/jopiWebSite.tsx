// noinspection JSUnusedGlobalSymbols

import {JopiRequest} from "./jopiRequest.ts";
import {ServerFetch} from "./serverFetch.ts";
import {ReactRouterManager} from "./reactRouterManager.ts";
import {LoadBalancer} from "./loadBalancing.ts";
import {addRoute, createRouter, findRoute, type RouterContext} from "rou3";
import {createBundle, handleBundleRequest} from "./hydrate.ts";
import type {ServerInstance, WebSocketConnectionInfos} from "./jopiServer.ts";
import {declareServerReady} from "@jopi-loader/client";
import {PostMiddlewares} from "./middlewares/index.ts";
import jwt from "jsonwebtoken";
import type {SearchParamFilterFunction} from "./searchParamFilter.ts";
import React from "react";
import {Page, PageContext, PageController_ExposePrivate, setPageRenderer, type UiUserInfos} from "jopi-rewrite-ui";
import * as ReactServer from "react-dom/server";
import type {PageCache} from "./caches/cache.ts";
import {VoidPageCache} from "./caches/cache.ts";
import {ONE_DAY} from "./publicTools.ts";
import "jopi-node-space";
import {getInMemoryCache} from "./caches/InMemoryCache.ts";

const nSocket = NodeSpace.webSocket;

export interface WebSite {
    data: any;

    getWelcomeUrl(): string;

    getCache(): PageCache;

    setCache(pageCache: PageCache): void;

    enableAutomaticCache(): void;

    onVerb(verb: HttpMethod, path: string | string[], handler: (req: JopiRequest) => Promise<Response>): WebSiteRoute;

    onGET(path: string | string[], handler: (req: JopiRequest) => Promise<Response>): WebSiteRoute;

    onPOST(path: string | string[], handler: (req: JopiRequest) => Promise<Response>): WebSiteRoute;

    onPUT(path: string | string[], handler: (req: JopiRequest) => Promise<Response>): WebSiteRoute;

    onDELETE(path: string | string[], handler: (req: JopiRequest) => Promise<Response>): WebSiteRoute;

    onPATCH(path: string | string[], handler: (req: JopiRequest) => Promise<Response>): WebSiteRoute;

    onHEAD(path: string | string[], handler: (req: JopiRequest) => Promise<Response>): WebSiteRoute;

    onOPTIONS(path: string | string[], handler: (req: JopiRequest) => Promise<Response>): WebSiteRoute;

    onWebSocketConnect(path: string, handler: JopiWsRouteHandler): void;

    on404_NotFound(handler: JopiRouteHandler): void;
    return404(req: JopiRequest): Response | Promise<Response>;

    on500_Error(handler: JopiRouteHandler): void;
    return500(req: JopiRequest, error?: Error | string): Response | Promise<Response>;

    on401_Unauthorized(handler: JopiRouteHandler): void;
    return401(req: JopiRequest, error?: Error | string): Response | Promise<Response>;

    /**
     * Try to authenticate a user.
     *
     * @param loginInfo
     *      Information about the user login/password.
     *      The real type is depending on what you use with the Website.setAuthHandler function.
     */
    tryAuthUser<T = LoginPassword>(loginInfo: T): Promise<AuthResult>;

    /**
     * Set the function which will verify user authentification
     * and returns information about this user once connected.
     */
    setAuthHandler<T>(authHandler: AuthHandler<T>): void;

    /**
     * Create a JWT token with the data.
     */
    createJwtToken(data: UserInfos): string | undefined;

    /**
     * Verify and decode the JWT token.
     * Returns the data this token contains, or undefined if the token is invalid.
     */
    decodeJwtToken(token: string): UserInfos | undefined;

    /**
     * Set the secret token for JWT cookies.
     */
    setJwtSecret(secret: string): void;

    /**
     * Allow hooking how the JWT token is stored in the user response.
     */
    setJwtTokenStore(store: JwtTokenStore): void;

    /**
     * If you are using HTTPs, allow creating an HTTP website
     * which will automatically redirect to the HTTP.
     */
    getOrCreateHttpRedirectWebsite(): WebSite;

    /**
     * Ask to update the current SSL certificate.
     * Will allow updating without restarting the server, nor losing connections.
     * Warning: only works with bun.ts, node.ts implementation does nothing.
     */
    updateSslCertificate(certificate: SslCertificatePath): void;

    getHeadersToCache(): string[];

    addHeaderToCache(header: string): void;

    addMiddleware(middleware: JopiMiddleware): void;

    addPostMiddleware(middleware: JopiPostMiddleware): void;

    addSourceServer<T>(serverFetch: ServerFetch<T>, weight?: number): void;

    enableCors(allows?: string[]): void;

    enableReactRouter(dirHint: string): Promise<void>;
}

export class WebSiteImpl implements WebSite {
    readonly port: number;
    readonly host: string;
    readonly welcomeUrl: string;
    readonly isHttps?: boolean = false;

    private http80WebSite?: WebSite;

    certificate?: SslCertificatePath;
    private middlewares?: JopiMiddleware[];
    private postMiddlewares?: JopiPostMiddleware[];
    private reactRouterManager?: ReactRouterManager;

    _onRebuildCertificate?: () => void;
    private readonly _onWebSiteReady?: (() => void)[];

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

        this.host = urlInfos.host;

        this.mainCache = options.cache || gVoidCache;
        this.router = createRouter<WebSiteRoute>();
        this.wsRouter = createRouter<JopiWsRouteHandler>();

        this._onWebSiteReady = options.onWebSiteReady;
        this.addRoute("GET", "/_bundle/*", handleBundleRequest);
    }

    getWelcomeUrl(): string {
        return this.welcomeUrl;
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

    async onServerStarted() {
        createBundle(this).then(() => {
            // In case we use jopin with browser refresh,
            // then we manually declare that the server is ok.
            //
            declareServerReady();

            if (this._onWebSiteReady) {
                this._onWebSiteReady.forEach(e => e());
            }
        });

        if (this.welcomeUrl) {
            console.log("Website started:", this.welcomeUrl);
        }
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

    private applyMiddlewares(handler: JopiRouteHandler): JopiRouteHandler {
        return async function(req: JopiRequest) {
            const mdw = (req.webSite as WebSiteImpl).middlewares;

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

            let mustUseAutoCache = req.mustUseAutoCache && (req.method === "GET");

            if (mustUseAutoCache) {
                let res = await req.getFromCache();

                if (res) {
                    return res;
                }
            }

            const pRes = handler(req);
            let res = pRes instanceof Promise ? await pRes : pRes;

            if (mustUseAutoCache && (res.status===200)) {
                res = await req.addToCache(res)!;
            }

            if (req.getJwtToken()) {
                (req.webSite as WebSiteImpl).storeJwtToken(req, res);
            }

            if ((req.webSite as WebSiteImpl).postMiddlewares) {
                const pMdw = (req.webSite as WebSiteImpl).postMiddlewares!;
                const count = pMdw.length;

                for (let i = 0; i < count; i++) {
                    const mRes = pMdw[i](req, res);
                    res = mRes instanceof Promise ? await mRes : mRes;
                }
            }

            return res;
        }
    }

    getOrCreateHttpRedirectWebsite(): WebSite {
        if (this.http80WebSite) return this.http80WebSite;
        if (this.port===80) return this;

        let urlInfos = new URL(this.welcomeUrl);
        urlInfos.port = "";
        urlInfos.protocol = "http";

        const webSite = new WebSiteImpl(urlInfos.href);
        this.http80WebSite = webSite;

        webSite.onGET("/**", async req => {
            req.urlInfos.port = "";
            req.urlInfos.protocol = "https";

            return req.redirectResponse(true, req.urlInfos.href);
        });

        return webSite;
    }

    updateSslCertificate(certificate: SslCertificatePath) {
        this.certificate = certificate;
        if (this._onRebuildCertificate) this._onRebuildCertificate();
    }

    declareNewWebSocketConnection(jws: JopiWebSocket, infos: WebSocketConnectionInfos, urlInfos: URL) {
        const matched = findRoute(this.wsRouter, "ws", urlInfos.pathname);

        if (!matched) {
            jws.close();
            return;
        }

        try { matched.data(jws, infos); }
        catch(e) { console.error(e) }
    }

    onWebSocketConnect(path: string, handler: JopiWsRouteHandler) {
        return this.addWsRoute(path, handler);
    }

    async enableReactRouter(dirHint: string): Promise<void> {
        this.reactRouterManager = new ReactRouterManager(this, dirHint);
        await this.reactRouterManager.initialize();
    }

    //region Cache

    mainCache: PageCache;
    mustUseAutomaticCache: boolean = false;
    private headersToCache: string[] = ["content-type", "etag", "last-modified"];

    getCache(): PageCache {
        return this.mainCache;
    }

    setCache(pageCache: PageCache) {
        this.mainCache = pageCache || gVoidCache;
    }

    enableAutomaticCache() {
        this.mustUseAutomaticCache = true;
        if(!this.mainCache) this.mainCache = getInMemoryCache();
    }

    getHeadersToCache(): string[] {
        return this.headersToCache;
    }

    addHeaderToCache(header: string) {
        header = header.trim().toLowerCase();
        if (!this.headersToCache.includes(header)) this.headersToCache.push(header);
    }

    //endregion

    //region JWT Token

    private JWT_SECRET?: string;
    private jwtSignInOptions?: jwt.SignOptions;
    private authHandler?: AuthHandler<any>;
    private jwtTokenStore?: JwtTokenStore;

    public storeJwtToken(req: JopiRequest, res: Response) {
        const token = req.getJwtToken();

        if (this.jwtTokenStore) {
            this.jwtTokenStore(req.getJwtToken()!, "jwt " + token, req, res);
        } else {
            // Note: here we don't set the "Authorization" header, since it's an input-only header.
            req.addCookie(res, "authorization", "jwt " + token, {maxAge: ONE_DAY * 7});
        }
    }

    public setJwtTokenStore(store: JwtTokenStore) {
        this.jwtTokenStore = store;
    }

    createJwtToken(data: UserInfos): string|undefined {
        try {
            return jwt.sign(data as object, this.JWT_SECRET!, this.jwtSignInOptions);
        } catch (e) {
            console.error("createJwtToken", e);
            return undefined;
        }
    }

    decodeJwtToken(token: string): UserInfos|undefined {
        if (!this.JWT_SECRET) return undefined;

        try { return jwt.verify(token, this.JWT_SECRET) as UserInfos; }
        catch { return undefined; }
    }

    setJwtSecret(secret: string) {
        this.JWT_SECRET = secret;
    }

    async tryAuthUser<T = LoginPassword>(loginInfo: T): Promise<AuthResult> {
        if (this.authHandler) {
            const res = this.authHandler(loginInfo);
            if (res instanceof Promise) return await res;
            return res;
        }

        return {isOk: false};
    }

    setAuthHandler<T>(authHandler: AuthHandler<T>) {
        this.authHandler = authHandler;
    }

    //endregion

    //region Routes processing

    private readonly router: RouterContext<WebSiteRoute>;
    private readonly wsRouter: RouterContext<JopiWsRouteHandler>;

    private _on404_NotFound?: JopiRouteHandler;
    private _on500_Error?: JopiErrorHandler;
    private _on401_Unauthorized?: JopiErrorHandler;

    addRoute(method: HttpMethod, path: string, handler:  (req: JopiRequest) => Promise<Response>) {
        const webSiteRoute: WebSiteRoute = {handler};
        addRoute(this.router, method, path, webSiteRoute);
        return webSiteRoute;
    }

    addWsRoute(path: string, handler: (ws: JopiWebSocket, infos: WebSocketConnectionInfos) => void) {
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

    getRouteFor(url: string, method: string = "GET"): WebSiteRoute|undefined {
        const matched = findRoute(this.router!, method, url);
        if (!matched) return undefined;
        return matched.data;
    }

    private ifRouteNotFound(req: JopiRequest) {
        return this.return404(req);
    }

    //region Path handler

    onVerb(verb: HttpMethod, path: string|string[], handler:  (req: JopiRequest) => Promise<Response>): WebSiteRoute {
        handler = this.applyMiddlewares(handler);

        if (Array.isArray(path)) {
            return this.addSharedRoute(verb, path, handler);
        }

        return this.addRoute(verb, path, handler);
    }

    onGET(path: string|string[], handler: (req: JopiRequest) => Promise<Response>): WebSiteRoute {
        return this.onVerb("GET", path, handler);
    }

    onPOST(path: string|string[], handler: (req: JopiRequest) => Promise<Response>): WebSiteRoute {
        return this.onVerb("POST", path, handler);
    }

    onPUT(path: string|string[], handler: (req: JopiRequest) => Promise<Response>): WebSiteRoute {
        return this.onVerb("PUT", path, handler);
    }

    onDELETE(path: string|string[], handler: (req: JopiRequest) => Promise<Response>): WebSiteRoute {
        return this.onVerb("DELETE", path, handler);
    }

    onPATCH(path: string|string[], handler: (req: JopiRequest) => Promise<Response>): WebSiteRoute {
        return this.onVerb("PATCH", path, handler);
    }

    onHEAD(path: string|string[], handler: (req: JopiRequest) => Promise<Response>): WebSiteRoute {
        return this.onVerb("HEAD", path, handler);
    }

    onOPTIONS(path: string|string[], handler: (req: JopiRequest) => Promise<Response>): WebSiteRoute {
        return this.onVerb("OPTIONS", path, handler);
    }

    //endregion

    //region Error handler

    on404_NotFound(handler: JopiRouteHandler) {
        this._on404_NotFound = handler;
    }

    on500_Error(handler: JopiRouteHandler) {
        this._on500_Error = handler;
    }

    on401_Unauthorized(handler: JopiRouteHandler) {
        this._on401_Unauthorized = handler;
    }

    return404(req: JopiRequest): Response|Promise<Response> {
        if (this._on404_NotFound) {
            return this._on404_NotFound(req);
        }

        if (G_Default404Template) {
            return req.reactResponse(<G_Default404Template />);
        }

        return new Response("", {status: 404});
    }

    return500(req: JopiRequest, error?: Error|string): Response|Promise<Response> {
        if (this._on500_Error) {
            return this._on500_Error(req, error);
        }

        if (G_Default500Template) {
            return req.reactResponse(<G_Default500Template />);
        }

        return new Response("", {status: 500});
    }

    return401(req: JopiRequest, error?: Error|string): Response|Promise<Response> {
        if (this._on401_Unauthorized) {
            return this._on401_Unauthorized(req, error);
        }

        if (G_Default401Template) {
            return req.reactResponse(<G_Default401Template />);
        }


        return new Response("", {status: 401});
    }

    //endregion

    //endregion
}

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

    /**
     * A list of listeners which must be called when the website is fully operational.
     */
    onWebSiteReady?: (()=>void)[];
}

export interface WebSiteRoute {
    handler: JopiRouteHandler;
    searchParamFilter?: SearchParamFilterFunction;
    mustDisableAutomaticCache?: boolean;
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

    sendMessage(msg: string|Buffer|Uint8Array|ArrayBuffer) {
        nSocket.sendMessage(this.webSocket, msg);
    }
}

export function newWebSite(url: string, options?: WebSiteOptions): WebSite {
    return new WebSiteImpl(url, options);
}

let G_Default404Template: undefined|React.ComponentType<any>;
let G_Default500Template: undefined|React.ComponentType<any>;
let G_Default401Template: undefined|React.ComponentType<any>;

export function setDefaultPage404Template(reactCpn: React.ComponentType<any>) {
    G_Default404Template = reactCpn;
}

export function setDefaultPage500Template(reactCpn: React.ComponentType<any>) {
    G_Default500Template = reactCpn;
}

export function setDefaultPage401Template(reactCpn: React.ComponentType<any>) {
    G_Default401Template = reactCpn;
}

export type JopiRouteHandler = (req: JopiRequest) => Promise<Response>;
export type JopiWsRouteHandler = (ws: JopiWebSocket, infos: WebSocketConnectionInfos) => void;
export type JopiErrorHandler = (req: JopiRequest, error?: Error|string) => Response|Promise<Response>;
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
export type RequestBody = ReadableStream<Uint8Array> | null;
export type SendingBody = ReadableStream<Uint8Array> | string | FormData | null;

export type WebSiteMap = {[hostname: string]: WebSite};

export type ResponseModifier = (res: Response, req: JopiRequest) => Response|Promise<Response>;
export type TextModifier = (text: string, req: JopiRequest) => string|Promise<string>;
export type TestCookieValue = (value: string) => boolean|Promise<boolean>;

export class NotAuthorizedException extends Error {
}

export class ServerAlreadyStartedError extends Error {
    constructor() {
        super("the server is already");
    }
}

export interface CookieOptions {
    maxAge?: number;
}

export interface UserInfos extends UiUserInfos {
}

export interface AuthResult {
    isOk: boolean;
    errorMessage?: string;
    authToken?: string;
    userInfos?: UserInfos;
}

export type JwtTokenStore = (jwtToken: string, cookieValue: string, req: JopiRequest, res: Response) => void;
export type AuthHandler<T> = (loginInfo: T) => AuthResult|Promise<AuthResult>;

export type JopiMiddleware = (req: JopiRequest) => Response | Promise<Response> | null;
export type JopiPostMiddleware = (req: JopiRequest, res: Response) => Response | Promise<Response>;

export interface SslCertificatePath {
    key: string;
    cert: string;
}

export interface LoginPassword {
    login: string;
    password: string;
}

// Hook the rendering of a page to a post-process it
//  to avoid some server side pitfall.
//
setPageRenderer((children, hook, options) => {
    const controller = new PageController_ExposePrivate<unknown>(false, options);
    hook?.(controller);

    // Allow forcing children rendering and by doing that, setting controller values.
    // It's required, since in React SSR there is no back-propagation and components
    // are never refreshed two times.
    //
    ReactServer.renderToStaticMarkup(<PageContext.Provider value={controller}>{children}</PageContext.Provider>);

    return <Page controller={controller}>{children}</Page>;
});

const gVoidCache = new VoidPageCache();