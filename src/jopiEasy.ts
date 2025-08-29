// noinspection JSUnusedGlobalSymbols

import {
    type AuthHandler,
    HTTP_VERBS, type HttpMethod, type JopiMiddleware, type JopiPostMiddleware,
    JopiRequest,
    type JopiRouteHandler,
    JopiServer, type JopiWsRouteHandler, type PageCache,
    type UserInfos,
    type WebSite, WebSiteImpl,
    WebSiteOptions
} from "./core.ts";

import path from "node:path";
import fsc from "node:fs";

import {type FetchOptions, type ServerDownResult, ServerFetch, type ServerFetchOptions} from "./serverFetch.ts";
import {getLetsEncryptCertificate, type LetsEncryptParams, type OnTimeoutError} from "./letsEncrypt.ts";
import {UserStore_WithLoginPassword, type UserInfos_WithLoginPassword} from "./userStores.ts";
import {setConfig_disableTailwind} from "./hydrate.ts";
import {serverInitChrono} from "./internalHelpers.js";
import {getInMemoryCache, initMemoryCache, type InMemoryCacheOptions} from "./caches/InMemoryCache.js";
import {SimpleFileCache} from "./caches/SimpleFileCache.js";
import {Middlewares} from "./middlewares/index.js";
import type {DdosProtectionOptions} from "./middlewares/DdosProtection.js";
import type {SearchParamFilterFunction} from "./searchParamFilter.js";

serverInitChrono.start("jopiEasy lib");

class JopiApp {
    private _isStartAppSet: boolean = false;

    globalConfig(): GlobalConfigBuilder {
        if (this._isStartAppSet) throw "App is already started";
        return new GlobalConfigBuilder();
    }

    startApp(f: (jopiEasy: JopiEasy) => void): void {
        if (this._isStartAppSet) throw "App is already started";
        this._isStartAppSet = true;

        f(new JopiEasy());
    }
}

class JopiEasy {
    new_webSite(url: string): JopiEasyWebSite {
        return new JopiEasyWebSite(url);
    }

    new_reverseProxy(url: string): ReverseProxyBuilder {
        return new ReverseProxyBuilder(url);
    }

    new_fileServer(url: string): FileServerBuilder {
        return new FileServerBuilder(url);
    }
}

export const jopiApp = new JopiApp();

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

    protected readonly afterHook: ((webSite: WebSite)=>void)[] = [];
    protected readonly beforeHook: (()=>Promise<void>)[] = [];

    protected readonly internals: WebSiteInternal;

    constructor(url: string) {
        setTimeout(() => { this.initWebSiteInstance().then() }, 1);

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
    }

    private async initWebSiteInstance(): Promise<void> {
        if (!this.webSite) {
            for (let hook of this.beforeHook) await hook();
            this.webSite = new WebSiteImpl(this.origin, this.options);
            this.afterHook.forEach(c => c(this.webSite!));

            myServer.addWebsite(this.webSite);
            autoStartServer();
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

    add_httpCertificate(): CertificateBuilder {
        return new CertificateBuilder(this, this.internals);
    }

    add_jwtTokenAuth(): { step_setPrivateKey: (privateKey: string) => ReturnType<JwtTokenAuth_Builder["setPrivateKey_STEP"]> } {
        const builder = new JwtTokenAuth_Builder(this, this.internals);

        return {
            step_setPrivateKey: (privateKey: string) => builder.setPrivateKey_STEP(privateKey)
        }
    }

    add_path(path: string|string[]): WebSitePathBuilder {
        return new WebSitePathBuilder(this, this.internals, path);
    }

    add_path_GET(path: string|string[], handler: (req: JopiRequest) => Promise<Response>): this {
        let res = new WebSitePathBuilder(this, this.internals, path);
        res.onGET(handler);
        return this;
    }

    add_cache(): WebSiteCacheBuilder {
        return new WebSiteCacheBuilder(this, this.internals);
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
}

class WebSite_AddSpecialPageHandler {
    constructor(private readonly webSite: JopiEasyWebSite, private readonly internals: WebSiteInternal) {
    }

    END_add_specialPageHandler(): JopiEasyWebSite {
        return this.webSite;
    }

    on_404_NotFound(handler: (req: JopiRequest) => Promise<Response>): this {
        this.internals.afterHook.push(webSite => {
            webSite.on404_NotFound(handler);
        });

        return this;
    }

    on_500_Error(handler: (req: JopiRequest) => Promise<Response>): this {
        this.internals.afterHook.push(webSite => {
            webSite.on500_Error(handler);
        });

        return this;
    }

    on_401_Unauthorized(handler: (req: JopiRequest) => Promise<Response>): this {
        this.internals.afterHook.push(webSite => {
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
        this.internals.afterHook.push(webSite => {
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

    use_custom(myMiddleware: JopiMiddleware): this {
        this.internals.afterHook.push(webSite => {
            webSite.addMiddleware(myMiddleware);
        });

        return this;
    }

    use_requestTimeout_sec(timeSec: number): this {
        return this.use_custom(Middlewares.requestTimeout_sec(timeSec));
    }

    use_ddosProtection(options?: DdosProtectionOptions): this {
        return this.use_custom(Middlewares.ddosProtection(options));
    }
}

//region WebSite_AddSourceServerBuilder

class WebSite_AddSourceServerBuilder<T> extends CreateServerFetch<T, WebSite_AddSourceServerBuilder_NextStep<T>> {
    private serverFetch?: ServerFetch<T>;

    constructor(private readonly webSite: JopiEasyWebSite, private readonly internals: WebSiteInternal) {
        super();

        this.internals.afterHook.push(webSite => {
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

        this.internals.afterHook.push(webSite => {
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

//endregion

class JopiEasyWebSite_ExposePrivate extends JopiEasyWebSite {
    getInternals(): WebSiteInternal {
        return this.internals;
    }
}

class WebSitePathBuilder_NextStep {
    private requiredRoles?: string[];
    private searchParamFilter?: SearchParamFilterFunction;

    constructor(private readonly webSite: JopiEasyWebSite,
                private readonly internals: WebSiteInternal,
                private readonly path: string|string[],
                verb: HttpMethod,
                handler: (req: JopiRequest) => Promise<Response>) {

        internals.afterHook.push(webSite => {
                if (this.requiredRoles) {
                    const requiredRoles = this.requiredRoles;
                    const oldHandler = handler;

                    handler = req => {
                        req.assertUserHasRoles(requiredRoles);
                        return oldHandler(req);
                    }
                }

                let route = webSite.onVerb(verb, path, handler);
                if (this.searchParamFilter) route.searchParamFilter = this.searchParamFilter;
        });
    }

    DONE_add_path(): JopiEasyWebSite {
        return this.webSite;
    }

    add_path(path: string|string[]): WebSitePathBuilder {
        return new WebSitePathBuilder(this.webSite, this.internals, path);
    }

    add_samePath(): WebSitePathBuilder {
        return new WebSitePathBuilder(this.webSite, this.internals, this.path);
    }

    add_requiredRole(role: string): WebSitePathBuilder_NextStep {
        if (!this.requiredRoles) this.requiredRoles = [role];
        else this.requiredRoles.push(role);
        return this;
    }

    add_requiredRoles(roles: string[]): WebSitePathBuilder_NextStep {
        if (!this.requiredRoles) this.requiredRoles = [...roles];
        else this.requiredRoles = [...this.requiredRoles, ...roles];
        return this;
    }

    add_searchParamFiler(filter: SearchParamFilterFunction): WebSitePathBuilder_NextStep {
        this.searchParamFilter = filter;
        return this;
    }
}

class WebSitePathBuilder {
    constructor(private readonly webSite: JopiEasyWebSite, private readonly internals: WebSiteInternal, private readonly path: string|string[]) {
    }

    onRequest(verb: HttpMethod, handler: (req: JopiRequest) => Promise<Response>): WebSitePathBuilder_NextStep {
        return new WebSitePathBuilder_NextStep(this.webSite, this.internals, this.path, verb, handler);
    }

    onGET(handler: (req: JopiRequest) => Promise<Response>): WebSitePathBuilder_NextStep {
        return this.onRequest("GET", handler);
    }

    onPOST(handler: (req: JopiRequest) => Promise<Response>): WebSitePathBuilder_NextStep {
        return this.onRequest("POST", handler);
    }

    onPUT(handler: (req: JopiRequest) => Promise<Response>): WebSitePathBuilder_NextStep {
        return this.onRequest("PUT", handler);
    }

    onDELETE(handler: (req: JopiRequest) => Promise<Response>): WebSitePathBuilder_NextStep {
        return this.onRequest("DELETE", handler);
    }

    onOPTIONS(handler: (req: JopiRequest) => Promise<Response>): WebSitePathBuilder_NextStep {
        return this.onRequest("OPTIONS", handler);
    }

    onPATCH(handler: (req: JopiRequest) => Promise<Response>): WebSitePathBuilder_NextStep {
        return this.onRequest("PATCH", handler);
    }

    onHEAD(handler: (req: JopiRequest) => Promise<Response>): WebSitePathBuilder_NextStep {
        return this.onRequest("HEAD", handler);
    }

    onWebSocketConnect(handler: JopiWsRouteHandler): { add_path: (path: string) => WebSitePathBuilder, DONE_add_path: () => JopiEasyWebSite } {
        this.internals.afterHook.push(webSite => {
            if (this.path instanceof Array) {
                this.path.forEach(p => webSite.onWebSocketConnect(p, handler));
            } else {
                webSite.onWebSocketConnect(this.path as string, handler)
            }
        });

        return {
            add_path: (path: string) => new WebSitePathBuilder(this.webSite, this.internals, path),
            DONE_add_path: () => this.webSite
        }
    }
}

class WebSiteCacheBuilder {
    private cache?: PageCache;

    constructor(private readonly webSite: JopiEasyWebSite, private readonly internals: WebSiteInternal) {
        this.internals.afterHook.push(webSite => {
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

//endregion

//region Server starting

let gIsAutoStartDone = false;

function autoStartServer(): void {
    if (gIsAutoStartDone) return;
    gIsAutoStartDone = true;

    setTimeout(()=>{
        myServer.startServer()
    }, 5);
}

const myServer = new JopiServer();

//endregion

//region Reverse proxy

class ReverseProxyBuilder {
    private readonly webSite: JopiEasyWebSite_ExposePrivate;
    private readonly internals: WebSiteInternal;

    constructor(url: string) {
        this.webSite = new JopiEasyWebSite_ExposePrivate(url);
        this.internals = this.webSite.getInternals();

        this.internals.afterHook.push(webSite => {
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

        this.internals.afterHook.push(webSite => {
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

    constructor(url: string) {
        this.webSite = new JopiEasyWebSite_ExposePrivate(url);
        this.internals = this.webSite.getInternals();

        this.options = {
            rootDir: "www",
            replaceIndexHtml: true,
            onNotFound: req => req.returnError404_NotFound()
        };

        this.internals.afterHook.push(webSite => {
            webSite.onGET("/**", req => {
                return req.serveFile(this.options.rootDir, {
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

class JwtTokenAuth_Builder {
    constructor(private readonly parent: JopiEasyWebSite, private readonly internals: WebSiteInternal) {
    }

    FINISH() {
        return {
            DONE_add_jwtTokenAuth: () => this.parent
        }
    }

    //region setPrivateKey_STEP (BEGIN / root)

    setPrivateKey_STEP(privateKey: string) {
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

    setUserStore_STEP() {
        const self = this;

        return {
            use_simpleLoginPassword: () => {
                this.loginPasswordStore = new UserStore_WithLoginPassword();

                this.internals.afterHook.push(webSite => {
                    this.loginPasswordStore!.setAuthHandler(webSite);
                });

                return this.useSimpleLoginPassword_BEGIN()
            },

            use_customStore<T>(store: AuthHandler<T>) { return self.useCustomStore_BEGIN<T>(store) }
        }
    }

    _setUserStore_NEXT() {
        return {
            stepOptional_setTokenStore: () => this.setTokenStore_STEP(),
            DONE_add_jwtTokenAuth: () => this.FINISH,
        }
    }

    //region useCustomStore

    useCustomStore_BEGIN<T>(store: AuthHandler<T>) {
        this.internals.afterHook.push(webSite => {
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

    useSimpleLoginPassword_BEGIN() {
        return this._useSimpleLoginPassword_REPEAT();
    }

    useSimpleLoginPassword_DONE() {
        return this._setUserStore_NEXT();
    }

    _useSimpleLoginPassword_REPEAT() {
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

    useSimpleLoginPassword_addOne(login: string, password: string, userInfos: UserInfos) {
        this.loginPasswordStore!.add({login, password, userInfos});

        return this._useSimpleLoginPassword_REPEAT();
    }

    useSimpleLoginPassword_addMany(users: UserInfos_WithLoginPassword[]) {
        users.forEach(e => this.loginPasswordStore!.add(e));
        return this._useSimpleLoginPassword_REPEAT();
    }

    //endregion

    //endregion

    //region setTokenStore

    setTokenStore_STEP() {
        return {
            use_cookie: (expirationDuration_days: number = 3600) => this.setTokenStore_useCookie(expirationDuration_days),
            use_authentificationHeader: () => this.setTokenStore_useAuthentificationHeader()
        }
    }

    setTokenStore_useCookie(expirationDuration_days: number = 3600) {
        this.internals.afterHook.push(webSite => {
            webSite.setJwtTokenStore((_token, cookieValue, req, res) => {
                req.addCookie(res, "authorization", cookieValue, {maxAge: NodeSpace.timer.ONE_DAY * expirationDuration_days})
            });
        });

        return this.FINISH();
    }

    setTokenStore_useAuthentificationHeader() {
        this.internals.afterHook.push(webSite => {
            webSite.setJwtTokenStore((token, _cookieValue, _req, res) => {
                res.headers.set("Authorization", `Bearer ${token}`);
            });
        });

        return this.FINISH();
    }

    //endregion
}

//endregion

//region Config

class GlobalConfigBuilder {
    disable_tailwind(): void {
        setConfig_disableTailwind();
    }
}

//endregion

//region Helpers

type GetValue<T> = (value: T) => void;

interface WebSiteInternal {
    origin: string;
    hostName: string;
    options: WebSiteOptions;

    afterHook: ((webSite: WebSite) => void)[];
    beforeHook: (() => Promise<void>)[];

    onHookWebSite?: (webSite: WebSite) => void;
}

//endregion