// noinspection JSUnusedGlobalSymbols

import {JopiRequest} from "./jopiRequest.tsx";
import {ServerFetch} from "./serverFetch.ts";
import {LoadBalancer} from "./loadBalancing.ts";
import {type CoreServer, type SseEvent, type WebSocketConnectionInfos} from "./jopiServer.ts";
import {PostMiddlewares} from "./middlewares/index.ts";
import jwt from "jsonwebtoken";
import type {SearchParamFilterFunction} from "./searchParamFilter.ts";
import React from "react";
import {ModuleInitContext, type ModuleInitContext_Host, PageController, type UiUserInfos} from "jopi-rewrite/ui";
import * as ReactServer from "react-dom/server";
import type {PageCache} from "./caches/cache.ts";
import {VoidPageCache} from "./caches/cache.ts";
import {ONE_DAY} from "./publicTools.ts";

import {getInMemoryCache} from "./caches/InMemoryCache.ts";
import {installBundleServer} from "./bundler/server.ts";
import {createBundle} from "./bundler/bundler.ts";
import * as jk_webSocket from "jopi-toolkit/jk_webSocket";
import type {EventGroup} from "jopi-toolkit/jk_events";
import * as jk_events from "jopi-toolkit/jk_events";
import {installBrowserRefreshSseEvent, isBrowserRefreshEnabled} from "jopi-rewrite/loader-client";
import {executeBrowserInstall} from "./linker.ts";
import {getNewServerInstanceBuilder, type ServerInstanceBuilder} from "./serverInstanceBuilder.ts";
import {PriorityLevel, sortByPriority, type ValueWithPriority} from "jopi-toolkit/jk_tools";

export type RouteHandler = (req: JopiRequest) => Promise<Response>;

export interface WebSite {
    data: any;

    getWelcomeUrl(): string;

    getCache(): PageCache;

    setCache(pageCache: PageCache): void;

    enableAutomaticCache(): void;

    onPage(path: string, pageKey: string, reactComponent: React.FC<any>): WebSiteRouteInfos;

    onVerb(verb: HttpMethod, path: string | string[], handler: (req: JopiRequest) => Promise<Response>): WebSiteRouteInfos;

    onGET(path: string | string[], handler: (req: JopiRequest) => Promise<Response>): WebSiteRouteInfos;

    onPOST(path: string | string[], handler: (req: JopiRequest) => Promise<Response>): WebSiteRouteInfos;

    onPUT(path: string | string[], handler: (req: JopiRequest) => Promise<Response>): WebSiteRouteInfos;

    onDELETE(path: string | string[], handler: (req: JopiRequest) => Promise<Response>): WebSiteRouteInfos;

    onPATCH(path: string | string[], handler: (req: JopiRequest) => Promise<Response>): WebSiteRouteInfos;

    onHEAD(path: string | string[], handler: (req: JopiRequest) => Promise<Response>): WebSiteRouteInfos;

    onOPTIONS(path: string | string[], handler: (req: JopiRequest) => Promise<Response>): WebSiteRouteInfos;

    onWebSocketConnect(path: string, handler: JopiWsRouteHandler): void;

    addSseEVent(path: string|string[], handler: SseEvent): void;

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

    addMiddleware(method: HttpMethod|undefined, middleware: JopiMiddleware, priority: PriorityLevel): void;

    addPostMiddleware(method: HttpMethod|undefined, middleware: JopiPostMiddleware, priority: PriorityLevel): void;

    addSourceServer<T>(serverFetch: ServerFetch<T>, weight?: number): void;

    enableCors(allows?: string[]): void;

    readonly events: EventGroup;
}

export class WebSiteImpl implements WebSite {
    readonly port: number;
    readonly host: string;
    readonly welcomeUrl: string;
    readonly isHttps?: boolean = false;

    private http80WebSite?: WebSite;

    certificate?: SslCertificatePath;
    private middlewares: Record<string, ValueWithPriority<JopiMiddleware>[]> = {};
    private postMiddlewares: Record<string, ValueWithPriority<JopiPostMiddleware>[]> = {};

    _onRebuildCertificate?: () => void;
    private readonly _onWebSiteReady?: (() => void)[];

    public readonly data: any = {};

    public readonly loadBalancer = new LoadBalancer();

    public readonly events: EventGroup = jk_events.defaultEventGroup;

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
        this.serverInstanceBuilder = getNewServerInstanceBuilder(this);

        this._onWebSiteReady = options.onWebSiteReady;

        // Allow hooking the newly created websites.
        jk_events.sendEvent("jopi.webSite.created", this);
    }

    getWelcomeUrl(): string {
        return this.welcomeUrl;
    }

    async processRequest(handler: RouteHandler, urlParts: any, routeInfos: WebSiteRouteInfos, urlInfos: URL|undefined, coreRequest: Request, coreServer: CoreServer): Promise<Response|undefined> {
        // For security reasons. Without that, an attacker can break a cache.
        if (urlInfos) urlInfos.hash = "";

        const req = new JopiRequest(this, urlInfos, coreRequest, coreServer, routeInfos);
        req.urlParts = urlParts;

        try {
            return await handler(req);
        } catch (e) {
            if (e instanceof SBPE_ServerByPassException) {
                if (e instanceof SBPE_DirectSendThisResponseException) {
                    return e.response;
                } else if (e instanceof SBPE_NotAuthorizedException) {
                    return req.textResponse(e.message, 401);
                } else if (e instanceof SBPE_MustReturnWithoutResponseException) {
                    return undefined;
                }
            }

            console.error(e);
            return this.return500(req, e as Error | string);
        }
    }

    async onBeforeServerStart() {
        await jk_events.sendAsyncEvent("jopi.server.before.start", {webSite: this});
        await createBundle(this);
        installBundleServer(this);
    }

    async onServerStarted() {
        if (this._onWebSiteReady) {
            this._onWebSiteReady.forEach(e => e());
        }

        if (isBrowserRefreshEnabled()) {
            installBrowserRefreshSseEvent(this);
        }

        if (this.welcomeUrl) {
            console.log("Website started:", this.welcomeUrl);
        }
    }

    addMiddleware(method: HttpMethod|undefined, middleware: JopiMiddleware, priority: PriorityLevel) {
        let m = method ? method : "*";
        if (!this.middlewares[m]) this.middlewares[m] = [];
        this.middlewares[m].push({priority, value: middleware});
    }

    addPostMiddleware(method: HttpMethod|undefined, middleware: JopiPostMiddleware, priority: PriorityLevel) {
        let m = method ? method : "*";
        if (!this.postMiddlewares[m]) this.postMiddlewares[m] = [];
        this.postMiddlewares[m].push({priority, value: middleware});
    }

    addSourceServer<T>(serverFetch: ServerFetch<T>, weight?: number) {
        this.loadBalancer.addServer<T>(serverFetch, weight);
    }

    enableCors(allows?: string[]) {
        if (!allows) allows = [this.welcomeUrl];
        this.addPostMiddleware(undefined, PostMiddlewares.cors({accessControlAllowOrigin: allows}), PriorityLevel.veryHigh);
    }

    private applyMiddlewares(verb: HttpMethod, handler: JopiRouteHandler): JopiRouteHandler {
        function merge<T>(a: T[]|undefined, b: T[]|undefined): T[]|undefined {
            if (!a) return b;
            if (!b) return a;
            return a.concat(b);
        }

        const webSite = this;

        const middlewares = sortByPriority(merge(this.middlewares[verb], this.middlewares["*"]));
        const middlewares_count = middlewares ? middlewares.length : 0;

        const postMiddlewares = sortByPriority(merge(this.postMiddlewares[verb], this.postMiddlewares["*"]));
        const postMiddlewares_count = postMiddlewares ? postMiddlewares.length : 0;

        if (verb==="GET") {
            return async function (req: JopiRequest) {
                // >>> Check the required roles.

                if (req.routeInfos.requiredRoles) {
                    req.assertUserHasRoles(req.routeInfos.requiredRoles);
                }

                // >>> Take from the cache.

                let mustUseAutoCache = req.mustUseAutoCache;

                if (mustUseAutoCache) {
                    if (req.routeInfos.beforeCheckingCache) {
                        let r = await req.routeInfos.beforeCheckingCache(req);
                        if (r) return r;
                    }

                    let res = await req.getFromCache();

                    if (res) {
                        if (req.routeInfos.afterGetFromCache) {
                            let r = await req.routeInfos.afterGetFromCache(req, res);
                            if (r) return r;
                        } else {
                            return res;
                        }
                    }
                }

                // >>> Apply the middlewares.

                if (middlewares) {
                    // Use a simple loop, which allow us to add/remove middleware at runtime.
                    // For example, it allows enabling / disabling logging requests.
                    //
                    for (let i = 0; i < middlewares_count; i++) {
                        const res = middlewares[i](req);
                        if (res) return res;
                    }
                }

                // >>> Create the content.

                const pRes = handler(req);
                let res = pRes instanceof Promise ? await pRes : pRes;

                // >>> Add the authentification cookie.

                if (req.getJwtToken()) {
                    webSite.storeJwtToken(req, res);
                }

                // >>> Apply the post-middlewares.

                if (postMiddlewares) {
                    for (let i = 0; i < postMiddlewares_count; i++) {
                        const mRes = postMiddlewares[i](req, res);
                        res = mRes instanceof Promise ? await mRes : mRes;
                    }
                }

                // >>> Add the result to the cache.

                if (mustUseAutoCache && (res.status === 200)) {
                    if (req.routeInfos.beforeAddToCache) {
                        let r = await req.routeInfos.beforeAddToCache(req, res);
                        if (r) res = await req.addToCache(r)!;
                    } else {
                        res = await req.addToCache(res)!;
                    }
                }

                return res;
            }
        } else {
            return async function (req: JopiRequest) {
                // >>> Check the required roles.

                if (req.routeInfos.requiredRoles) {
                    req.assertUserHasRoles(req.routeInfos.requiredRoles);
                }

                // >>> Apply the middlewares.

                if (middlewares) {
                    // Use a simple loop, which allow us to add/remove middleware at runtime.
                    // For example, it allows enabling / disabling logging requests.
                    //
                    for (let i = 0; i < middlewares_count; i++) {
                        const res = middlewares[i](req);
                        if (res) return res;
                    }
                }

                // >>> Create the content.

                const pRes = handler(req);
                let res = pRes instanceof Promise ? await pRes : pRes;

                // >>> Add the authentification cookie.

                if (req.getJwtToken()) {
                    webSite.storeJwtToken(req, res);
                }

                // >>> Apply the post-middlewares.

                if (postMiddlewares) {
                    for (let i = 0; i < postMiddlewares_count; i++) {
                        const mRes = postMiddlewares[i](req, res);
                        res = mRes instanceof Promise ? await mRes : mRes;
                    }
                }

                return res;
            }
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

    /*declareNewWebSocketConnection(jws: JopiWebSocket, infos: WebSocketConnectionInfos, urlInfos: URL) {
        const matched = findRoute(this.wsRouter, "ws", urlInfos.pathname);

        if (!matched) {
            jws.close();
            return;
        }

        try { matched.data(jws, infos); }
        catch(e) { console.error(e) }
    }*/

    onWebSocketConnect(path: string, handler: JopiWsRouteHandler) {
        return this.serverInstanceBuilder.addWsRoute(path, handler);
    }

    addSseEVent(path: string, handler: SseEvent): void {
        this.serverInstanceBuilder.addSseEVent(path, handler);
    }

    //region UI Modules

    executeBrowserInstall(pageController: PageController) {
        executeBrowserInstall(this.createModuleInitInstance(pageController));
    }

    /**
     * Allow overriding the instance used by modules 'uiInit.tsx' files.
     * @param instancier
     */
    setModuleInitClassInstancier(instancier: (host: ModuleInitContext_Host) =>  ModuleInitContext) {
        this.createModuleInitInstance = instancier;
    }

    private createModuleInitInstance(pageController: ModuleInitContext_Host): ModuleInitContext {
        // Note: this function will be replaced.
        return new ModuleInitContext(pageController);
    }

    //endregion

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

    public readonly serverInstanceBuilder: ServerInstanceBuilder;

    private _on404_NotFound?: JopiErrorHandler;
    private _on500_Error?: JopiErrorHandler;
    private _on401_Unauthorized?: JopiErrorHandler;

    private allRouteInfos: Record<string, WebSiteRouteInfos> = {};

    private saveRouteInfos(verb: string, route: string, routeInfos: WebSiteRouteInfos) {
        this.allRouteInfos[verb + " " + route] = routeInfos;
    }

    getRouteInfos(verb: string, route: string): WebSiteRouteInfos|undefined {
        return this.allRouteInfos[verb + " " + route];
    }

    //region Path handler

    onVerb(verb: HttpMethod, path: string, handler: (req: JopiRequest) => Promise<Response>): WebSiteRouteInfos {
        handler = this.applyMiddlewares(verb, handler);

        const routeInfos: WebSiteRouteInfos = {handler};
        this.saveRouteInfos(verb, path, routeInfos);

        this.serverInstanceBuilder.addRoute(verb, path, routeInfos);
        return routeInfos;
    }

    onPage(path: string, pageKey: string, reactComponent: React.FC<any>): WebSiteRouteInfos {
        const routeInfos: WebSiteRouteInfos = {handler: gVoidRouteHandler};
        this.saveRouteInfos("GET", path, routeInfos);

        this.serverInstanceBuilder.addPage(path, pageKey, reactComponent, routeInfos);
        return routeInfos;
    }

    onGET(path: string, handler: (req: JopiRequest) => Promise<Response>): WebSiteRouteInfos {
        return this.onVerb("GET", path, handler);
    }

    onPOST(path: string, handler: (req: JopiRequest) => Promise<Response>): WebSiteRouteInfos {
        return this.onVerb("POST", path, handler);
    }

    onPUT(path: string, handler: (req: JopiRequest) => Promise<Response>): WebSiteRouteInfos {
        return this.onVerb("PUT", path, handler);
    }

    onDELETE(path: string, handler: (req: JopiRequest) => Promise<Response>): WebSiteRouteInfos {
        return this.onVerb("DELETE", path, handler);
    }

    onPATCH(path: string, handler: (req: JopiRequest) => Promise<Response>): WebSiteRouteInfos {
        return this.onVerb("PATCH", path, handler);
    }

    onHEAD(path: string, handler: (req: JopiRequest) => Promise<Response>): WebSiteRouteInfos {
        return this.onVerb("HEAD", path, handler);
    }

    onOPTIONS(path: string, handler: (req: JopiRequest) => Promise<Response>): WebSiteRouteInfos {
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

    private cacheFor_404_NotFound?: string;

    /**
     * Allow resetting the cache if the generator has been updated.
     */
    private cacheFor_404_NotFound_ref?: any;

    async return404(req: JopiRequest): Promise<Response> {
        const accept = req.headers.get("accept");
        if (!accept || !accept.startsWith("text/html")) return new Response("", {status: 404});

        if (this._on404_NotFound) {
            let res = await this._on404_NotFound(req);
            if (res instanceof Promise) res = await res;

            if (res) {
                if (res.status !== 404) {
                    return new Response(res.body, {status: 404, headers: res.headers});
                }
            }
        }

        // Use a cache. Without that here 404 will trigger a full React rendering.
        //
        if ((this.cacheFor_404_NotFound === undefined) || (this.cacheFor_404_NotFound_ref!==G_Default404Template)) {
            if (G_Default404Template) {
                this.cacheFor_404_NotFound = ReactServer.renderToStaticMarkup(<G_Default404Template />);
                this.cacheFor_404_NotFound_ref = G_Default404Template;
            } else {
                this.cacheFor_404_NotFound = "404 Not Found";
            }
        }

        return new Response(this.cacheFor_404_NotFound, {status: 404, headers: {"content-type": "text/html"}});
    }

    async return500(req: JopiRequest, error?: Error|string): Promise<Response> {
        const accept = req.headers.get("accept");
        if (!accept || !accept.startsWith("text/html")) return new Response("", {status: 500});

        if (this._on500_Error) {
            let res = this._on500_Error(req, error);
            if (res instanceof Promise) res = await res;

            if (res) {
                if (res.status !== 500) {
                    return new Response(res.body, {status: 500, headers: res.headers});
                }
            }
        }

        if (req.method!=="GET") {
            return new Response(error ? error.toString() : "", {status: 500});
        }

        if (G_Default500Template) {
            let res = req.reactResponse(<G_Default500Template/>);
            return new Response(res.body, {status: 500, headers: res.headers});
        }

        return new Response(error ? error.toString() : "", {status: 500});
    }

    async return401(req: JopiRequest, error?: Error|string): Promise<Response> {
        if (this._on401_Unauthorized) {
            let res = this._on401_Unauthorized(req, error);
            if (res instanceof Promise) res = await res;

            if (res) {
                if (res.status !== 401) {
                    return new Response(res.body, {status: 401, headers: res.headers});
                }
            }
        }

        if (req.method!=="GET") {
            return new Response(error ? error.toString() : "", {status: 401});
        }

        if (G_Default401Template) {
            let res = req.reactResponse(<G_Default401Template/>);
            return new Response(res.body, {status: 401, headers: res.headers});
        }

        return new Response(error ? error.toString() : "", {status: 401});
    }

    //endregion

    //endregion
}

const gVoidRouteHandler = () => Promise.resolve(new Response("void", {status: 200}));

export interface ServeFileOptions {
    /**
     * If true, then /index.html is replaced by / in the browser nav bar.
     * Default is true.
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

export interface WebSiteRouteInfos {
    handler: JopiRouteHandler;

    /**
     * If true, the automatic cache is disabled for this path.
     */
    mustDisableAutomaticCache?: boolean;

    /**
     * A list of roles which are required.
     */
    requiredRoles?: string[];

    /**
     * Define a filter to use to sanitize the search params of the url.
     */
    searchParamFilter?: SearchParamFilterFunction;

    /**
     * If true, the automatic cache will be disabled for this path.
     */
    disableAutoCache?: boolean;

    /**
     * Is executed before checking the cache.
     * If a response is returned/void, then directly returns this response.
     */
    beforeCheckingCache?: (req: JopiRequest) => Promise<Response|undefined|void>;

    /**
     * Is executed before adding the response to the cache.
     * Returns the response or undefined/void to avoid adding to the cache.
     */
    beforeAddToCache?: (req: JopiRequest, res: Response) => Promise<Response|undefined|void>;

    /**
     * Is executed after getting the response from the cache.
     * Returns the response or undefined/void to avoid using this cache entry.
     */
    afterGetFromCache?: (req: JopiRequest, res: Response) => Promise<Response|undefined|void>;
}

export class JopiWebSocket {
    constructor(private readonly webSite: WebSite, private readonly server: CoreServer, private readonly webSocket: WebSocket) {
    }

    close(): void {
        this.webSocket.close();
    }

    onMessage(listener: (msg: string|Buffer) => void): void {
        jk_webSocket.onMessage(this.webSocket, listener);
    }

    sendMessage(msg: string|Buffer|Uint8Array|ArrayBuffer) {
        jk_webSocket.sendMessage(this.webSocket, msg);
    }
}

export function newWebSite(url: string, options?: WebSiteOptions): WebSite {
    return new WebSiteImpl(url, options);
}

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

export type ResponseModifier = (res: Response, req: JopiRequest) => Response|Promise<Response>;
export type TextModifier = (text: string, req: JopiRequest) => string|Promise<string>;
export type TestCookieValue = (value: string) => boolean|Promise<boolean>;

export type JwtTokenStore = (jwtToken: string, cookieValue: string, req: JopiRequest, res: Response) => void;
export type AuthHandler<T> = (loginInfo: T) => AuthResult|Promise<AuthResult>;

export type JopiMiddleware = (req: JopiRequest) => Response | Promise<Response> | null;
export type JopiPostMiddleware = (req: JopiRequest, res: Response) => Response | Promise<Response>;

export class SBPE_ServerByPassException extends Error {
}

export class SBPE_NotAuthorizedException extends SBPE_ServerByPassException {
}

export class SBPE_DirectSendThisResponseException extends SBPE_ServerByPassException {
    constructor(public readonly response: Response) {
        super();
    }
}

export class SBPE_MustReturnWithoutResponseException extends SBPE_ServerByPassException {
    constructor() {
        super();
    }
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

export interface SslCertificatePath {
    key: string;
    cert: string;
}

export interface LoginPassword {
    login: string;
    password: string;
}

const gVoidCache = new VoidPageCache();

let G_Default404Template: undefined|React.ComponentType<any>;
let G_Default500Template: undefined|React.ComponentType<any>;
let G_Default401Template: undefined|React.ComponentType<any>;