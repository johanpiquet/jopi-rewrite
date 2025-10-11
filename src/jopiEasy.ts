// noinspection JSUnusedGlobalSymbols

import path from "node:path";
import fsc from "node:fs";
import NodeSpace, {nTimer} from "jopi-node-space";

import type {Config as TailwindConfig} from 'tailwindcss';
import {type FetchOptions, type ServerDownResult, ServerFetch, type ServerFetchOptions} from "./serverFetch.ts";
import {getLetsEncryptCertificate, type LetsEncryptParams, type OnTimeoutError} from "./letsEncrypt.ts";
import {type UserInfos_WithLoginPassword, UserStore_WithLoginPassword} from "./userStores.ts";
import {getBundlerConfig, type PostCssInitializer} from "./bundler/config.ts";
import {serverInitChronos} from "./internalTools.ts";
import {getInMemoryCache, initMemoryCache, type InMemoryCacheOptions} from "./caches/InMemoryCache.ts";
import {SimpleFileCache} from "./caches/SimpleFileCache.ts";
import {Middlewares} from "./middlewares/index.ts";
import type {DdosProtectionOptions} from "./middlewares/DdosProtection.ts";
import type {SearchParamFilterFunction} from "./searchParamFilter.ts";
import {
    type CrawlerCanIgnoreIfAlreadyCrawled,
    ProcessUrlResult,
    type UrlProcessedInfos,
    WebSiteCrawler,
    type WebSiteCrawlerOptions
} from "jopi-crawler";
import {JopiRequest} from "./jopiRequest.ts";
import {
    type AuthHandler,
    type HttpMethod,
    type JopiMiddleware,
    type JopiPostMiddleware,
    type JopiRouteHandler,
    JopiWebSocket,
    type UserInfos,
    type WebSite,
    WebSiteImpl,
    WebSiteOptions
} from "./jopiWebSite.js";
import type {PageCache} from "./caches/cache.js";
import {getServer, type WebSocketConnectionInfos} from "./jopiServer.js";
import {HTTP_VERBS, ONE_KILO_OCTET} from "./publicTools.ts";
import {getImportTransformConfig} from "@jopi-loader/tools";

serverInitChronos.start("jopiEasy lib");

class JopiApp {
    private _isStartAppSet: boolean = false;

    globalConfig(): GlobalConfigBuilder {
        if (this._isStartAppSet) throw "App is already started";
        return new GlobalConfigBuilder();
    }

    startApp(importMeta: any, f: (jopiEasy: JopiEasy) => void|Promise<void>): void {
        async function doStart() {
            await NodeSpace.app.waitServerSideReady();
            NodeSpace.app.declareAppStarted();

            let res = f(new JopiEasy());
            if (res instanceof Promise) await res;
        }

        if (this._isStartAppSet) throw "App is already started";
        this._isStartAppSet = true;

        NodeSpace.app.setApplicationMainFile(importMeta.filename);

        doStart().then();
    }
}

class JopiEasy {
    private getDefaultUrl(): string {
        let config = getImportTransformConfig();

        if (config.webSiteListeningUrl) return config.webSiteListeningUrl;
        if (config.webSiteUrl) return config.webSiteUrl;

        throw new Error("Invalid package.json configuration. 'jopi.webSiteUrl' or 'jopi.webSiteListeningUrl' must be set");
    }

    new_webSite(url?: string, ref?: RefFor_WebSite): JopiEasyWebSite {
        if (!url) {
            url = this.getDefaultUrl();
        }

        const res = new JopiEasyWebSite_ExposePrivate(url);
        if (ref) ref.webSite = res;
        return res;
    }

    new_reverseProxy(url?: string|undefined, ref?: RefFor_WebSite): ReverseProxyBuilder {
        if (!url) {
            url = this.getDefaultUrl();
        }

        return new ReverseProxyBuilder(url, ref);
    }

    new_fileServer(url?: string|undefined, ref?: RefFor_WebSite): FileServerBuilder {
        if (!url) {
            url = this.getDefaultUrl();
        }

        return new FileServerBuilder(url, ref);
    }

    new_downloader(urlOrigin?: string|undefined): CrawlerDownloader {
        if (!urlOrigin) {
            urlOrigin = this.getDefaultUrl();
        }
        
        return new CrawlerDownloader(urlOrigin);
    }
}

export class RefFor_WebSite {
    webSite?: JopiEasyWebSite;

    waitWebSiteReady(): Promise<void> {
        if (!this.webSite) return Promise.reject("website not set");

        return new Promise<void>((resolve) => {
            this.webSite?.on_webSiteReady(resolve);
        });
    }
}

export const jopiApp = new JopiApp();

//region Crawler

class CrawlerDownloader {
    private readonly _options: WebSiteCrawlerOptions = {};
    private _outputDir: string = "www-out";
    private _startUrl?: string;
    private readonly _urlPrefix: string;
    private _ignoreIfAlreadyDownloaded?: boolean;
    private _onUrlProcessed?: (infos: UrlProcessedInfos)=>void;
    private _filter_canIgnoreIfAlreadyCrawled?: (url: string, infos: CrawlerCanIgnoreIfAlreadyCrawled) => boolean;


    constructor(private readonly urlOrigin: string) {
        const urlInfos = new URL(urlOrigin);
        this._urlPrefix = urlInfos.origin;
        this._outputDir = path.resolve(process.cwd(), "www_" + urlInfos.hostname);
    }

    /**
     * Define the directory where files will be downloaded.
     * If not set, that it takes the current url and the hostname.
     */
    set_outputDir(outputDir: string){
        this._outputDir = outputDir;
        return this;
    }
    
    /**
     * Define the start point url.
     * If not set, the default is "/".
     * @param url
     */
    set_startUrl(url: string) {
        this._startUrl = this.normalizeUrl(url);
        return this;
    }

    private normalizeUrl(url: string): string {
        if (url.startsWith(this._urlPrefix)) {
            return url.substring(this._urlPrefix.length);
        }

        return url;
    }

    /**
     * Add url with must be crawled.
     * Is required if these urls aren't reachable from the start point.
     */
    set_extraUrls(urlList: string[]) {
        urlList = urlList.map(u => this.normalizeUrl(u));
        this._options.scanThisUrls = [...new Set([...this._options.scanThisUrls||[], ...urlList])];
        return this;
    }

    /**
     * Allow avoiding downloading again a resource if already in cache.
     * @param value
     */
    setOption_ignoreIfAlreadyDownloaded(value = true) {
        this._ignoreIfAlreadyDownloaded = value;
        return this;
    }

    /**
     * Set a function which is called when a URL has been processed.
     *
     * @param listener - A function that received information about the URL and his processing state.
     */
    on_urlProcessed(listener: (infos: UrlProcessedInfos) => void) {
        this._onUrlProcessed = listener;
        return this;
    }

    /**
     * Sets a filter function to determine whether a URL can be downloaded.
     *
     * @param filter - A function that takes the URL as a string and a boolean flag
     *                 indicating if it is a resource, and returns a boolean indicating
     *                 whether the URL can be downloaded.
     *
     *                 Returns true if the url can be processed.
     */
    setFilter_canProcessThisUrl(filter: (url: string, isResource: boolean)=>boolean) {
        this._options.canDownload = filter;
        return this;
    }

    setFilter_canIgnoreIfAlreadyDownloaded(filter: (url: string, infos: CrawlerCanIgnoreIfAlreadyCrawled)=>boolean) {
        if (this._ignoreIfAlreadyDownloaded===undefined) {
            this._ignoreIfAlreadyDownloaded = true;
        }

        this._filter_canIgnoreIfAlreadyCrawled = filter;
        return this;
    }

    async START_DOWNLOAD(): Promise<void> {
        const downloader = this;

        const crawler = new WebSiteCrawler(this.urlOrigin, {
            outputDir: this._outputDir,

            onUrlProcessed(infos) {
                switch (infos.state) {
                    case ProcessUrlResult.IGNORED:
                        console.log("👎 Website downloader, url IGNORED:", infos.sourceUrl);
                        break;

                    case ProcessUrlResult.ERROR:
                        console.log("❌ Website downloader, url ERROR:", infos.sourceUrl);
                        break;

                    case ProcessUrlResult.OK:
                        console.log("✅ Website downloader, url DOWNLOADED:", infos.sourceUrl);
                        break;

                    case ProcessUrlResult.REDIRECTED:
                        console.log("🚫 Website downloader, url REDIRECTED:", infos.sourceUrl);
                        break;
                }

                if (downloader._onUrlProcessed) {
                    downloader._onUrlProcessed(infos);
                }
            },

            canIgnoreIfAlreadyCrawled(url, infos) {
                if (!downloader._ignoreIfAlreadyDownloaded) return false;

                if (downloader._filter_canIgnoreIfAlreadyCrawled) {
                    return downloader._filter_canIgnoreIfAlreadyCrawled(url, infos)
                }

                return true;
            },

            ... this._options
        });

        console.log("Downloading website", this.urlOrigin)
        await crawler.start(this._startUrl);
        console.log("Download finished for", this.urlOrigin)
    }
}

//endregion

//region CreateServerFetch

class CreateServerFetch<T, R extends CreateServerFetch_NextStep<T>> {
    protected options?: ServerFetchOptions<T>;

    protected createNextStep(options: ServerFetchOptions<T>): R {
        return new CreateServerFetch_NextStep(options) as R;
    }

    /**
     * The server will be call with his IP and not his hostname
     * which will only be set in the headers. It's required when
     * the DNS doesn't pinpoint to the god server.
     */
    useIp(serverOrigin: string, ip: string, options?: ServerFetchOptions<T>): R {
        let rOptions = ServerFetch.getOptionsFor_useIP<T>(serverOrigin, ip, options);
        this.options = rOptions;
        return this.createNextStep(rOptions);
    }

    useOrigin(serverOrigin: string, options?: ServerFetchOptions<T>): R {
        let rOptions = ServerFetch.getOptionsFor_useOrigin<T>(serverOrigin, options);
        this.options = rOptions;
        return this.createNextStep(rOptions);
    }
}

class CreateServerFetch_NextStep<T> {
    constructor(protected options: ServerFetchOptions<T>) {
    }

    set_weight(weight: number): this {
        this.options.weight = weight;
        return this;
    }

    set_isMainServer(): this {
        return this.set_weight(1);
    }

    set_isBackupServer(): this {
        return this.set_weight(0);
    }

    on_beforeRequesting(handler: (url: string, fetchOptions: FetchOptions, data: T)=>void|Promise<void>): this {
        this.options.beforeRequesting = handler;
        return this;
    }

    on_ifServerIsDown(handler: (builder: IfServerDownBuilder<T>)=>void|Promise<void>): this {
        this.options.ifServerIsDown = async (_fetcher, data) => {
            const {builder, getResult} = IfServerDownBuilder.newBuilder<T>(data);

            let r = handler(builder);
            if (r instanceof Promise) await r;

            let options = getResult();

            if (options) {
                const res: ServerDownResult<T> = {
                    newServer: ServerFetch.useAsIs(options),
                    newServerWeight: options?.weight
                }

                return res;
            }

            return undefined;
        }

        return this;
    }

    do_startServer(handler: () => Promise<number>): this {
        this.options.doStartServer = handler;
        return this;
    }

    do_stopServer(handler: () => Promise<void>): this {
        this.options.doStopServer = handler;
        return this;
    }
}

class IfServerDownBuilder<T> extends CreateServerFetch<T, CreateServerFetch_NextStep<T>> {
    constructor(public readonly data: T) {
        super();
    }

    static newBuilder<T>(data: T) {
        const b = new IfServerDownBuilder<T>(data);
        return {builder: b, getResult: () => b.options};
    }
}

//endregion

//region WebSite

class JopiEasyWebSite {
    protected readonly origin: string;
    protected readonly hostName: string;
    private webSite?: WebSiteImpl;
    protected readonly options: WebSiteOptions = {};

    protected readonly afterHook: ((webSite: WebSite)=>(Promise<void>))[] = [];
    protected readonly beforeHook: (()=>Promise<void>)[] = [];

    protected readonly internals: WebSiteInternal;

    protected _isWebSiteReady: boolean = false;

    constructor(url: string) {
        setTimeout(async () => {
            await this.initWebSiteInstance();
        }, 1);

        const urlInfos = new URL(url);
        this.hostName = urlInfos.hostname; // 127.0.0.1
        this.origin = urlInfos.origin; // https://127.0.0.1

        this.internals = {
            options: this.options,
            origin: this.origin,
            hostName: this.hostName,
            afterHook: this.afterHook,
            beforeHook: this.beforeHook
        };

        this.options.onWebSiteReady = [() => {
            this._isWebSiteReady = true;
        }];
    }

    private async initWebSiteInstance(): Promise<void> {
        if (!this.webSite) {
            for (let hook of this.beforeHook) await hook();
            this.webSite = new WebSiteImpl(this.origin, this.options);

            for (const hook of  this.afterHook) {
                try {
                    await hook(this.webSite!);
                }
                catch (e: any) {
                    if (e instanceof Error) {
                        NodeSpace.term.logBgRed("Error when initializing website", this.origin);
                        NodeSpace.term.logRed(e.message);
                        console.log(e.stack);
                    }
                    else {
                        console.error("Error when initializing website", this.origin);
                        NodeSpace.term.logRed("|-", e.message);
                    }

                    process.exit(1);
                }
            }

            myServer.addWebsite(this.webSite);
            await autoStartServer();
        }

        if (this.internals.onHookWebSite) {
            this.internals.onHookWebSite(this.webSite);
        }
    }

    hook_webSite(hook: (webSite: WebSite) => void): this {
        this.internals.onHookWebSite = hook;
        return this;
    }

    DONE_createWebSite(): JopiApp {
        return jopiApp;
    }

    enable_automaticRoutes(reactPageDir = "routes") {
        this.internals.afterHook.push(async webSite => {
            await webSite.getReactRouterManager().initialize(reactPageDir);
        });

        return this;
    }

    enable_automaticCache() {
        return new WebSite_AutomaticCacheBuilder(this, this.internals);
    }

    add_httpCertificate(): CertificateBuilder {
        return new CertificateBuilder(this, this.internals);
    }

    add_jwtTokenAuth(): JWT_BEGIN {
        const builder = new JwtTokenAuth_Builder(this, this.internals);

        return {
            step_setPrivateKey: (privateKey: string) => builder.setPrivateKey_STEP(privateKey)
        }
    }

    add_path(path: string|string[]): WebSite_PathBuilder {
        return new WebSite_PathBuilder(this, this.internals, path);
    }

    add_path_GET(path: string|string[], handler: (req: JopiRequest) => Promise<Response>): this {
        let res = new WebSite_PathBuilder(this, this.internals, path);
        res.onGET(handler);
        return this;
    }

    add_path_USE(path: string|string[], def: RouterPathDefinition): this {
        let res = new WebSite_PathBuilder(this, this.internals, path);
        res.use(def);
        return this;
    }

    add_cache(): WebSite_CacheBuilder {
        return new WebSite_CacheBuilder(this, this.internals);
    }

    add_sourceServer<T>(): WebSite_AddSourceServerBuilder<T> {
        return new WebSite_AddSourceServerBuilder<T>(this, this.internals);
    }

    add_middleware(): WebSite_MiddlewareBuilder {
        return new WebSite_MiddlewareBuilder(this, this.internals);
    }

    add_postMiddleware(): WebSite_PostMiddlewareBuilder {
        return new WebSite_PostMiddlewareBuilder(this, this.internals);
    }

    add_specialPageHandler(): WebSite_AddSpecialPageHandler {
        return new WebSite_AddSpecialPageHandler(this, this.internals);
    }

    on_webSiteReady(listener: () => void) {
        if (this._isWebSiteReady) {
            listener();
            return;
        }

        this.options.onWebSiteReady!.push(listener);
        return this;
    }

    use_modules(): WebSite_UserModules {
        return new WebSite_UserModules(this, this.internals);
    }
}

class WebSite_UserModules {
    private readonly modules: string[] = [];
    private moduleDir?: string;

    constructor(private readonly webSite: JopiEasyWebSite, private readonly internals: WebSiteInternal) {
        this.internals.afterHook.push(async webSite => {
            if (!this.moduleDir) {
                this.moduleDir = path.join(NodeSpace.app.getSourceCodeDir(), "modules");
            } else {
                if (!path.isAbsolute(this.moduleDir)) {
                    this.moduleDir = path.join(NodeSpace.app.getSourceCodeDir(), this.moduleDir);
                }
            }

            const modulesManager = (webSite as WebSiteImpl).getModulesManager();
            modulesManager.addModules(this.moduleDir , this.modules);
            await modulesManager.initializeModules();
        });
    }

    set_moduleDir(dirName: string): WebSite_UserModules {
        this.moduleDir = dirName;
        return this;
    }

    add_module(moduleName: string): WebSite_UserModules {
        this.modules.push(moduleName);
        return this;
    }

    END_use_modules(): JopiEasyWebSite {
        return this.webSite;
    }
}

class JopiEasyWebSite_ExposePrivate extends JopiEasyWebSite {
    isWebSiteReady() {
        return this._isWebSiteReady;
    }

    getInternals(): WebSiteInternal {
        return this.internals;
    }
}

class WebSite_AddSpecialPageHandler {
    constructor(private readonly webSite: JopiEasyWebSite, private readonly internals: WebSiteInternal) {
    }

    END_add_specialPageHandler(): JopiEasyWebSite {
        return this.webSite;
    }

    on_404_NotFound(handler: (req: JopiRequest) => Promise<Response>): this {
        this.internals.afterHook.push(async webSite => {
            webSite.on404_NotFound(handler);
        });

        return this;
    }

    on_500_Error(handler: (req: JopiRequest) => Promise<Response>): this {
        this.internals.afterHook.push(async webSite => {
            webSite.on500_Error(handler);
        });

        return this;
    }

    on_401_Unauthorized(handler: (req: JopiRequest) => Promise<Response>): this {
        this.internals.afterHook.push(async webSite => {
            webSite.on401_Unauthorized(handler);
        });

        return this;
    }
}

class WebSite_PostMiddlewareBuilder {
    constructor(private readonly webSite: JopiEasyWebSite, private readonly internals: WebSiteInternal) {
    }

    END_add_postMiddleware(): JopiEasyWebSite {
        return this.webSite;
    }

    use_custom(myMiddleware: JopiPostMiddleware): this {
        this.internals.afterHook.push(async webSite => {
            webSite.addPostMiddleware(myMiddleware);
        });

        return this;
    }
}

class WebSite_MiddlewareBuilder {
    constructor(private readonly webSite: JopiEasyWebSite, private readonly internals: WebSiteInternal) {
    }

    END_add_middleware(): JopiEasyWebSite {
        return this.webSite;
    }

    use_custom(myMiddleware: JopiMiddleware): WebSite_MiddlewareBuilder {
        this.internals.afterHook.push(async webSite => {
            webSite.addMiddleware(myMiddleware);
        });

        return this;
    }

    use_requestTimeout_sec(timeSec: number): WebSite_MiddlewareBuilder {
        return this.use_custom(Middlewares.requestTimeout_sec(timeSec));
    }

    use_cors(): WebSite_MiddlewareBuilder {
        this.internals.afterHook.push(async webSite => {
            webSite.enableCors();
        })

        return this;
    }

    use_ddosProtection(options?: DdosProtectionOptions): WebSite_MiddlewareBuilder {
        return this.use_custom(Middlewares.ddosProtection(options));
    }
}

class WebSite_AddSourceServerBuilder<T> extends CreateServerFetch<T, WebSite_AddSourceServerBuilder_NextStep<T>> {
    private serverFetch?: ServerFetch<T>;

    constructor(private readonly webSite: JopiEasyWebSite, private readonly internals: WebSiteInternal) {
        super();

        this.internals.afterHook.push(async webSite => {
            if (this.serverFetch) {
                webSite.addSourceServer(this.serverFetch);
            }
        });
    }

    protected override createNextStep(options: ServerFetchOptions<T>): WebSite_AddSourceServerBuilder_NextStep<T> {
        return new WebSite_AddSourceServerBuilder_NextStep(this.webSite, this.internals, options);
    }

    END_add_sourceServer(): JopiEasyWebSite {
        return this.webSite;
    }

    add_sourceServer<T>(): WebSite_AddSourceServerBuilder<T> {
        return new WebSite_AddSourceServerBuilder<T>(this.webSite, this.internals);
    }
}

class WebSite_AddSourceServerBuilder_NextStep<T> extends CreateServerFetch_NextStep<T> {
    constructor(private readonly webSite: JopiEasyWebSite, private readonly internals: WebSiteInternal, options: ServerFetchOptions<T>) {
        super(options);

        this.internals.afterHook.push(async webSite => {
            webSite.addSourceServer(ServerFetch.useAsIs(this.options));
        });
    }

    END_add_sourceServer(): JopiEasyWebSite {
        return this.webSite;
    }

    add_sourceServer<T>(): WebSite_AddSourceServerBuilder<T> {
        return new WebSite_AddSourceServerBuilder<T>(this.webSite, this.internals);
    }
}

export interface RouterPathDefinition {
    onGET?: (req: JopiRequest) => Promise<Response>;
    onPOST?: (req: JopiRequest) => Promise<Response>;
    onPUT?: (req: JopiRequest) => Promise<Response>;
    onDELETE?: (req: JopiRequest) => Promise<Response>;
    onOPTIONS?: (req: JopiRequest) => Promise<Response>;
    onPATCH?: (req: JopiRequest) => Promise<Response>;
    onHEAD?: (req: JopiRequest) => Promise<Response>;
    onWebSocket?: (ws: JopiWebSocket, infos: WebSocketConnectionInfos) => void;

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

class WebSite_PathBuilder {
    constructor(private readonly webSite: JopiEasyWebSite, private readonly internals: WebSiteInternal, private readonly path: string|string[]) {
    }

    use(def: RouterPathDefinition) {
        return new WebSite_PathBuilder_UsePathDefinition(this.webSite, this.internals, this.path, def);
    }

    onGET(handler: (req: JopiRequest) => Promise<Response>): WebSite_PathBuilder_NextStep {
        return new WebSite_PathBuilder_NextStep(this.webSite, this.internals, this.path, {onGET: handler});
    }

    onPOST(handler: (req: JopiRequest) => Promise<Response>): WebSite_PathBuilder_NextStep {
        return new WebSite_PathBuilder_NextStep(this.webSite, this.internals, this.path, {onPOST: handler});
    }

    onPUT(handler: (req: JopiRequest) => Promise<Response>): WebSite_PathBuilder_NextStep {
        return new WebSite_PathBuilder_NextStep(this.webSite, this.internals, this.path, {onPUT: handler});
    }

    onDELETE(handler: (req: JopiRequest) => Promise<Response>): WebSite_PathBuilder_NextStep {
        return new WebSite_PathBuilder_NextStep(this.webSite, this.internals, this.path, {onDELETE: handler});
    }

    onOPTIONS(handler: (req: JopiRequest) => Promise<Response>): WebSite_PathBuilder_NextStep {
        return new WebSite_PathBuilder_NextStep(this.webSite, this.internals, this.path, {onOPTIONS: handler});
    }

    onPATCH(handler: (req: JopiRequest) => Promise<Response>): WebSite_PathBuilder_NextStep {
        return new WebSite_PathBuilder_NextStep(this.webSite, this.internals, this.path, {onPATCH: handler});
    }

    onHEAD(handler: (req: JopiRequest) => Promise<Response>): WebSite_PathBuilder_NextStep {
        return new WebSite_PathBuilder_NextStep(this.webSite, this.internals, this.path, {onHEAD: handler});
    }

    onWebSocketConnect(handler: (ws: JopiWebSocket, infos: WebSocketConnectionInfos) => void): Pick<WebSite_PathBuilder_NextStep, 'add_path' | 'add_samePath' | 'DONE_add_path'> {
        return new WebSite_PathBuilder_NextStep(this.webSite, this.internals, this.path, {onWebSocket: handler});
    }
}

function usePathDefinition(path: string | string[], routeDef: RouterPathDefinition, webSite: WebSite) {
    const addVerb = (verb: HttpMethod, handler: JopiRouteHandler) => {
        let route = webSite.onVerb(verb, path, handler!);

        if (routeDef.searchParamFilter) route.searchParamFilter = routeDef.searchParamFilter;
        if (routeDef.mustDisableAutomaticCache) route.mustDisableAutomaticCache = true;
        if (routeDef.requiredRoles) route.requiredRoles = routeDef.requiredRoles;
        if (routeDef.afterGetFromCache) route.afterGetFromCache = routeDef.afterGetFromCache;
        if (routeDef.beforeCheckingCache) route.beforeCheckingCache = routeDef.beforeCheckingCache;
        if (routeDef.beforeAddToCache) route.beforeAddToCache = routeDef.beforeAddToCache;
    };

    if (routeDef.onGET) addVerb("GET", routeDef.onGET);
    if (routeDef.onPOST) addVerb("POST", routeDef.onPOST);
    if (routeDef.onPATCH) addVerb("PATCH", routeDef.onPATCH);
    if (routeDef.onDELETE) addVerb("DELETE", routeDef.onDELETE);
    if (routeDef.onOPTIONS) addVerb("OPTIONS", routeDef.onOPTIONS);
    if (routeDef.onHEAD) addVerb("HEAD", routeDef.onHEAD);

    if (routeDef.onWebSocket) {
        const handler = routeDef.onWebSocket;

        if (path instanceof Array) {
            path.forEach(p => webSite.onWebSocketConnect(p, handler));
        } else {
            webSite.onWebSocketConnect(path as string, handler)
        }
    }
}

class WebSite_PathBuilder_UsePathDefinition {
    constructor(private readonly webSite: JopiEasyWebSite,
                private readonly internals: WebSiteInternal,
                private readonly path: string | string[],
                routeDef: RouterPathDefinition)
    {
        this.internals.afterHook.push(async webSite => {
            usePathDefinition(path, routeDef, webSite);
        });
    }

    DONE_add_path(): JopiEasyWebSite {
        return this.webSite;
    }

    add_path(path: string|string[]): WebSite_PathBuilder {
        return new WebSite_PathBuilder(this.webSite, this.internals, path);
    }

    add_samePath(): WebSite_PathBuilder {
        return new WebSite_PathBuilder(this.webSite, this.internals, this.path);
    }
}

class WebSite_PathBuilder_NextStep {
    constructor(private readonly webSite: JopiEasyWebSite,
                private readonly internals: WebSiteInternal,
                private readonly path: string|string[],
                private readonly routeDef: RouterPathDefinition) {
        this.internals.afterHook.push(async webSite => {
            usePathDefinition(path, routeDef, webSite);
        });
    }

    DONE_add_path(): JopiEasyWebSite {
        return this.webSite;
    }

    add_path(path: string|string[]): WebSite_PathBuilder {
        return new WebSite_PathBuilder(this.webSite, this.internals, path);
    }

    add_samePath(): WebSite_PathBuilder {
        return new WebSite_PathBuilder(this.webSite, this.internals, this.path);
    }

    add_requiredRole(role: string): WebSite_PathBuilder_NextStep {
        if (!this.routeDef.requiredRoles) this.routeDef.requiredRoles = [role];
        else this.routeDef.requiredRoles.push(role);
        return this;
    }

    add_requiredRoles(roles: string[]): WebSite_PathBuilder_NextStep {
        if (!this.routeDef.requiredRoles) this.routeDef.requiredRoles = [...roles];
        else this.routeDef.requiredRoles = [...this.routeDef.requiredRoles, ...roles];
        return this;
    }

    add_searchParamFiler(filter: SearchParamFilterFunction): WebSite_PathBuilder_NextStep {
        this.routeDef.searchParamFilter = filter;
        return this;
    }

    disable_automaticCache(): WebSite_PathBuilder_NextStep {
        this.routeDef.mustDisableAutomaticCache = true;
        return this;
    }

    on_afterGetFromCache(handler: (req: JopiRequest, res: Response) => Promise<Response|undefined|void>): WebSite_PathBuilder_NextStep {
        this.routeDef.afterGetFromCache = handler;
        return this;
    }

    on_beforeAddToCache(handler: (req: JopiRequest, res: Response) => Promise<Response|undefined|void>): WebSite_PathBuilder_NextStep {
        this.routeDef.beforeAddToCache = handler;
        return this;
    }

    on_beforeCheckingCache(handler: (req: JopiRequest) => Promise<Response|undefined|void>): WebSite_PathBuilder_NextStep {
        this.routeDef.beforeCheckingCache = handler;
        return this;
    }
}

class WebSite_CacheBuilder {
    private cache?: PageCache;

    constructor(private readonly webSite: JopiEasyWebSite, private readonly internals: WebSiteInternal) {
        this.internals.afterHook.push(async webSite => {
            if (this.cache) {
                webSite.setCache(this.cache);
            }
        });
    }

    use_inMemoryCache(options?: InMemoryCacheOptions): this {
        if (options) initMemoryCache(options);
        this.cache = getInMemoryCache();

        return this;
    }

    use_fileSystemCache(rootDir: string): this {
        this.cache = new SimpleFileCache(rootDir);
        return this;
    }

    END_add_cache(): JopiEasyWebSite {
        return this.webSite;
    }
}

interface WebSite_AutomaticCacheBuilder_End {
    END_use_AutomaticCache(): JopiEasyWebSite;
}

interface WebSite_AutomaticCacheBuilder_End {
    END_use_AutomaticCache(): JopiEasyWebSite;
}

interface AutoCacheBuilder_Internal {
    webSiteInternal: WebSiteInternal;
    initCache?: (webSite: WebSite) => void;
}

class WebSite_AutomaticCacheBuilder implements WebSite_AutomaticCacheBuilder_End {
    private readonly cacheInternal: AutoCacheBuilder_Internal;

    constructor(private readonly webSite: JopiEasyWebSite, internals: WebSiteInternal) {
        this.cacheInternal = {
            webSiteInternal: internals,
        }

        internals.afterHook.push(async webSite => {
            if (this.cacheInternal.initCache) {
                this.cacheInternal.initCache(webSite);
            }
        });

        new WebSite_AutomaticCacheBuilder_UseMemoryCache(this.webSite, this.cacheInternal);
    }

    use_memoryCache(): WebSite_AutomaticCacheBuilder_UseMemoryCache {
        return new WebSite_AutomaticCacheBuilder_UseMemoryCache(this.webSite, this.cacheInternal);
    }

    use_fileCache(): WebSite_AutomaticCacheBuilder_UseFileCache {
        return new WebSite_AutomaticCacheBuilder_UseFileCache(this.webSite, this.cacheInternal);
    }

    END_use_AutomaticCache() {
        return this.webSite;
    }
}

class WebSite_AutomaticCacheBuilder_UseFileCache {
    private rootDir: string = path.join(NodeSpace.app.getTempDir(), "page-cache");

    constructor(private readonly webSite: JopiEasyWebSite, private readonly internals: AutoCacheBuilder_Internal) {
        this.internals.initCache = (webSite) => {
            webSite.setCache(new SimpleFileCache(this.rootDir));
            webSite.enableAutomaticCache();
        };
    }

    setConfig_rootDir(rootDir: string): this {
        this.rootDir = rootDir;
        return this;
    }

    END_use_AutomaticCache() {
        return this.webSite;
    }
}

class WebSite_AutomaticCacheBuilder_UseMemoryCache {
    private readonly cacheOptions: InMemoryCacheOptions = {};

    constructor(private readonly webSite: JopiEasyWebSite, private readonly internals: AutoCacheBuilder_Internal) {
        this.internals.initCache = (webSite) => {
            initMemoryCache(this.cacheOptions);
            webSite.setCache(getInMemoryCache());
            webSite.enableAutomaticCache();
        };
    }

    END_use_AutomaticCache() {
        return this.webSite;
    }

    /**
     * The memory cache survives hot-reload.
     * If a hot-reload occurs, the cache contact is kept as-is.
     * This option allows changing this behavior and automatically clearing
     * the memory cache if a hot-reload is detected.
     */
    setConfig_clearOnHotReload(value: boolean = true): this {
        this.cacheOptions.clearOnHotReload = value;
        return this;
    }

    /**
     * If an item is larger than this value, then he will not be added to the cache.
     * Default value is 600 ko.
     */
    setConfig_maxContentLength(value: number = ONE_KILO_OCTET * 600): this {
        this.cacheOptions.maxContentLength = value;
        return this;
    }

    /**
     * The max number of items in the cache.
     * Default is 5000.
     */
    setConfig_maxItemCount(value: number = 5000): this {
        this.cacheOptions.maxItemCount = value;
        return this;
    }

    /**
     * A delta which allows not triggering garbage collector too soon.
     * Default is 10% of maxItemCount.
     */
    setConfig_maxItemCountDelta(value: number): this {
        this.cacheOptions.maxItemCountDelta = value;
        return this;
    }

    /**
     * The max memory usage (mesure is Mo).
     * Default is 500Mo
     */
    setConfig_maxMemoryUsage_mo(value: number = 500): this {
        this.cacheOptions.maxMemoryUsage_mo = value;
        return this;
    }

    /**
     * A delta which allows not triggering garbage collector too soon.
     * Default is 10% of maxMemoryUsage_mo.
     */
    setConfig_maxMemoryUsageDela_mo(value: number = 500): this {
        this.cacheOptions.maxMemoryUsageDela_mo = value;
        return this;
    }
}

//endregion

//region Server starting

let gIsAutoStartDone = false;

async function autoStartServer() {
    if (gIsAutoStartDone) return;
    gIsAutoStartDone = true;

    await nTimer.tick(5);
    await myServer.startServer();
}

const myServer = getServer();

//endregion

//region Reverse proxy

class ReverseProxyBuilder {
    private readonly webSite: JopiEasyWebSite_ExposePrivate;
    private readonly internals: WebSiteInternal;

    constructor(url: string, ref?: RefFor_WebSite) {
        this.webSite = new JopiEasyWebSite_ExposePrivate(url);
        if (ref) ref.webSite = this.webSite;

        this.internals = this.webSite.getInternals();

        this.internals.afterHook.push(async webSite => {
            const handler: JopiRouteHandler = req => {
                req.headers.set('X-Forwarded-Proto', req.urlInfos.protocol.replace(':', ''));
                req.headers.set('X-Forwarded-Host', req.urlInfos.host)

                const clientIp = req.coreServer.requestIP(req.coreRequest)?.address;
                req.headers.set("X-Forwarded-For", clientIp!);

                return req.directProxyToServer();
            };

            HTTP_VERBS.forEach(verb => {
                webSite.onVerb(verb, "/**", handler);
            });
        });
    }

    add_target<T>(): ReverseProxyBuilder_AddTarget<T> {
        const {builder, getOptions} = ReverseProxyBuilder_AddTarget.newBuilder<T>(this);

        this.internals.afterHook.push(async webSite => {
            let options = getOptions();

            if (options) {
                webSite.addSourceServer(ServerFetch.useAsIs<T>(options));
            }
        });

        return builder;
    }

    DONE_new_reverseProxy(): JopiEasyWebSite_ExposePrivate {
        return this.webSite;
    }
}

class ReverseProxyBuilder_AddTarget<T> extends CreateServerFetch<T, ReverseProxyBuilder_AddTarget_NextStep<T>> {
    static newBuilder<T>(parent: ReverseProxyBuilder): { builder: ReverseProxyBuilder_AddTarget<T>, getOptions: () => ServerFetchOptions<T> | undefined } {
        const b = new ReverseProxyBuilder_AddTarget<T>(parent);
        return {builder: b, getOptions: () => b.options};
    }

    constructor(private readonly parent: ReverseProxyBuilder) {
        super();
    }

    DONE_add_target(): ReverseProxyBuilder {
        return this.parent;
    }
}

class ReverseProxyBuilder_AddTarget_NextStep<T> extends CreateServerFetch_NextStep<T> {
    constructor(private readonly parent: ReverseProxyBuilder, protected options: ServerFetchOptions<T>) {
        super(options);
    }

    DONE_add_target(): ReverseProxyBuilder {
        return this.parent;
    }
}

//endregion

//region File server

interface FileServerOptions {
    rootDir: string;
    replaceIndexHtml: boolean,
    onNotFound: (req: JopiRequest) => Response|Promise<Response>
}

class FileServerBuilder {
    private readonly webSite: JopiEasyWebSite_ExposePrivate;
    private readonly internals: WebSiteInternal;
    private readonly options: FileServerOptions;

    constructor(url: string, ref?: RefFor_WebSite) {
        this.webSite = new JopiEasyWebSite_ExposePrivate(url);
        if (ref) ref.webSite = this.webSite;

        this.internals = this.webSite.getInternals();

        this.options = {
            rootDir: "www",
            replaceIndexHtml: true,
            onNotFound: req => req.returnError404_NotFound()
        };

        this.internals.afterHook.push(async webSite => {
            webSite.onGET("/**", req => {
                return req.serverFromDir(this.options.rootDir, {
                    replaceIndexHtml: this.options.replaceIndexHtml,
                    onNotFound: this.options.onNotFound
                });
            });
        });
    }

    set_rootDir(rootDir: string): this {
        this.options.rootDir = rootDir;
        return this;
    }

    set_onNotFound(handler: (req: JopiRequest) => Response|Promise<Response>): this {
        this.options.onNotFound = handler;
        return this;
    }

    DONE_new_fileServer(): JopiEasyWebSite_ExposePrivate {
        return this.webSite;
    }
}

//endregion

//region TLS Certificates

//region CertificateBuilder

class CertificateBuilder {
    constructor(private readonly parent: JopiEasyWebSite, private readonly internals: WebSiteInternal) {
    }

    generate_localDevCert(saveInDir: string = "certs") {
        this.internals.beforeHook.push(async () => {
            try {
                this.internals.options.certificate = await myServer.createDevCertificate(this.internals.hostName, saveInDir);
            }
            catch {
                console.error(`Can't create ssl certificate for ${this.internals.hostName}. Is mkcert tool installed ?`);
            }
        });

        return {
            DONE_add_httpCertificate: () => this.parent
        }
    }

    use_dirStore(dirPath: string) {
        dirPath = path.join(dirPath, this.internals.hostName);

        let cert:string = "";
        let key: string = "";

        try {
            cert = path.resolve(dirPath, "certificate.crt.key")
            fsc.statfsSync(cert)
        } catch {
            console.error("Certificat file not found: ", cert);
        }

        try {
            key = path.resolve(dirPath, "certificate.key")
            fsc.statfsSync(key)
        } catch {
            console.error("Certificat key file not found: ", key);
        }

        this.internals.options.certificate = {key, cert};

        return {
            DONE_add_httpCertificate: () => this.parent
        }
    }

    generate_letsEncryptCert(email: string) {
        const params: LetsEncryptParams = {email};

        this.internals.afterHook.push(async webSite => {
            await getLetsEncryptCertificate(webSite, params);
        });

        return new LetsEncryptCertificateBuilder(this.parent, params);
    }
}

//endregion

//region LetsEncryptCertificateBuilder

class LetsEncryptCertificateBuilder {
    constructor(private readonly parent: JopiEasyWebSite, private readonly params: LetsEncryptParams) {
    }

    DONE_add_httpCertificate() {
        return this.parent;
    }

    enable_production(value: boolean = true) {
        this.params.isProduction = value;
        return this;
    }

    disable_log() {
        this.params.log = false;
        return this;
    }

    set_certificateDir(dirPath: string) {
        this.params.certificateDir = dirPath;
        return this;
    }

    force_expireAfter_days(dayCount: number) {
        this.params.expireAfter_days = dayCount;
        return this;
    }

    force_timout_sec(value: number) {
        this.params.timout_sec = value;
        return this;
    }

    if_timeOutError(handler: OnTimeoutError) {
        this.params.onTimeoutError = handler;
        return this;
    }
}

//endregion

//endregion

//region JWT Tokens

//region Interfaces

interface JWT_BEGIN {
    step_setPrivateKey(privateKey: string): JWT_StepBegin_SetUserStore;
}

interface JWT_FINISH {
    DONE_add_jwtTokenAuth(): JopiEasyWebSite;
}

interface JWT_StepBegin_SetUserStore {
    step_setUserStore(): JWT_Step_SetUserStore;
}

interface JWT_Step_SetUserStore {
    use_simpleLoginPassword(): JWT_UseSimpleLoginPassword;

    use_customStore<T>(store: AuthHandler<T>): JWT_UseCustomStore;
}

interface JWT_UseCustomStore {
    DONE_use_customStore(): JWT_StepBegin_Configure;
}

interface JWT_UseSimpleLoginPassword {
    getStoreRef(h: GetValue<UserStore_WithLoginPassword>): JWT_UseSimpleLoginPassword;
    addOne(login: string, password: string, userInfos: UserInfos): JWT_UseSimpleLoginPassword;
    addMany(users: UserInfos_WithLoginPassword[]): JWT_UseSimpleLoginPassword;
    DONE_use_simpleLoginPassword(): JWT_StepBegin_Configure;
}

interface JWT_StepBegin_Configure {
    stepConfigure(): JWT_Step_Configure;
    DONE_setUserStore(): JWT_FINISH;
}

interface JWT_Step_Configure {
    set_cookieDuration(expirationDuration_hours: number): JWT_Step_Configure;
    DONE_stepConfigure(): JWT_FINISH;
}


//endregion

class JwtTokenAuth_Builder {
    constructor(private readonly parent: JopiEasyWebSite, private readonly internals: WebSiteInternal) {
    }

    FINISH() {
        return {
            DONE_add_jwtTokenAuth: () => this.parent
        }
    }

    //region setPrivateKey_STEP (BEGIN / root)

    setPrivateKey_STEP(privateKey: string): JWT_StepBegin_SetUserStore {
        this.internals.afterHook.push(async webSite => {
            webSite.setJwtSecret(privateKey);
        });

        return {
            step_setUserStore: () => this.setUserStore_STEP()
        }
    }

    //endregion

    //region setUserStore_STEP

    private loginPasswordStore?: UserStore_WithLoginPassword;

    setUserStore_STEP(): JWT_Step_SetUserStore {
        const self = this;

        return {
            use_simpleLoginPassword: () => {
                this.loginPasswordStore = new UserStore_WithLoginPassword();

                this.internals.afterHook.push(async webSite => {
                    this.loginPasswordStore!.setAuthHandler(webSite);
                });

                return this.useSimpleLoginPassword_BEGIN()
            },

            use_customStore<T>(store: AuthHandler<T>) { return self.useCustomStore_BEGIN<T>(store) }
        }
    }

    _setUserStore_NEXT(): JWT_StepBegin_Configure {
        return {
            stepConfigure: () => this.stepConfigure(),
            DONE_setUserStore: () => this.FINISH(),
        }
    }

    //region useCustomStore

    useCustomStore_BEGIN<T>(store: AuthHandler<T>) {
        this.internals.afterHook.push(async webSite => {
            webSite.setAuthHandler(store);
        })

        return {
            DONE_use_customStore : () => this.useCustomStore_DONE()
        }
    }

    useCustomStore_DONE() {
        return this._setUserStore_NEXT();
    }

    //endregion

    //region useSimpleLoginPassword

    useSimpleLoginPassword_BEGIN(): JWT_UseSimpleLoginPassword {
        return this._useSimpleLoginPassword_REPEAT();
    }

    useSimpleLoginPassword_DONE(): JWT_StepBegin_Configure {
        return this._setUserStore_NEXT();
    }

    _useSimpleLoginPassword_REPEAT(): JWT_UseSimpleLoginPassword {
        return {
            getStoreRef: (h: GetValue<UserStore_WithLoginPassword>) => {
                h(this.loginPasswordStore!);
                return this._useSimpleLoginPassword_REPEAT();
            },

            addOne: (login: string, password: string, userInfos: UserInfos) => this.useSimpleLoginPassword_addOne(login, password, userInfos),
            addMany: (users: UserInfos_WithLoginPassword[]) => this.useSimpleLoginPassword_addMany(users),
            DONE_use_simpleLoginPassword: () => this.useSimpleLoginPassword_DONE()
        }
    }

    useSimpleLoginPassword_addOne(login: string, password: string, userInfos: UserInfos): JWT_UseSimpleLoginPassword {
        this.loginPasswordStore!.add({login, password, userInfos});

        return this._useSimpleLoginPassword_REPEAT();
    }

    useSimpleLoginPassword_addMany(users: UserInfos_WithLoginPassword[]): JWT_UseSimpleLoginPassword {
        users.forEach(e => this.loginPasswordStore!.add(e));
        return this._useSimpleLoginPassword_REPEAT();
    }

    //endregion

    //endregion

    //region setTokenStore

    stepConfigure(): JWT_Step_Configure {
        return {
            set_cookieDuration: (expirationDuration_hours: number) => this.setTokenStore_useCookie(expirationDuration_hours),
            DONE_stepConfigure: () => this.FINISH()
        }
    }

    setTokenStore_useCookie(expirationDuration_hours: number = 3600) {
        this.internals.afterHook.push(async webSite => {
            webSite.setJwtTokenStore((token, cookieValue, req, res) => {
                req.addCookie(res, "authorization", cookieValue, {maxAge: NodeSpace.timer.ONE_HOUR * expirationDuration_hours})
            });
        });

        return this.stepConfigure();
    }

    //endregion
}

//endregion

//region Config

class GlobalConfigBuilder {
    configure_tailwindProcessor() {
        return {
            disableTailwind: () => {
                getBundlerConfig().tailwind.disable = true;
                return this.configure_tailwindProcessor();
            },

            setCssTemplate: (template: string) => {
                getBundlerConfig().tailwind.template = template;
                return this.configure_tailwindProcessor();
            },

            setConfig: (config: TailwindConfig) => {
                getBundlerConfig().tailwind.config = config;
                return this.configure_tailwindProcessor();
            },

            /**
             * Allows adding extra-sources files to scan.
             * Can also be motifs. Ex: "./myDir/*.{js,ts,jsx,tsx}"
             */
            addExtraSourceFiles(...files: string[]) {
                const config = getBundlerConfig().tailwind;
                if (!config.extraSourceFiles) config.extraSourceFiles = [];
                config.extraSourceFiles.push(...files);
            }
        }
    }

    configure_postCss() {
        return {
            setPlugin: (handler: PostCssInitializer) => {
                getBundlerConfig().postCss.initializer = handler;
                return this.configure_postCss()
            }
        }
    }
}

//endregion

//region Helpers

type GetValue<T> = (value: T) => void;

interface WebSiteInternal {
    origin: string;
    hostName: string;
    options: WebSiteOptions;

    afterHook: ((webSite: WebSite) => void|Promise<void>)[];
    beforeHook: (() => Promise<void>)[];

    onHookWebSite?: (webSite: WebSite) => void;
}

//endregion