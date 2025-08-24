// noinspection JSUnusedGlobalSymbols

import {
    type AuthHandler,
    HTTP_VERBS, type HttpMethod,
    JopiRequest,
    type JopiRouteHandler,
    JopiServer, type JopiWsRouteHandler,
    type UserInfos,
    type WebSite, WebSiteImpl,
    WebSiteOptions
} from "./core.ts";

import path from "node:path";
import fsc from "node:fs";

import {ServerFetch, type ServerFetchOptions} from "./serverFetch.ts";
import {getLetsEncryptCertificate, type LetsEncryptParams, type OnTimeoutError} from "./letsEncrypt.ts";
import {UserStore_WithLoginPassword, type UserInfos_WithLoginPassword} from "./userStores.ts";
import {setConfig_disableTailwind} from "./hydrate.ts";
import {enableDevMode, isDevMode} from "./devMode.ts";
import {serverInitChrono} from "./internalHelpers.js";

serverInitChrono.start("jopiEasy lib");

class JopiApp {
    private _isStartAppSet: boolean = false;

    globalConfig() {
        if (this._isStartAppSet) throw "App is already started";
        return new GlobalConfigBuilder();
    }

    set_devMode(devMod: boolean) {
        if (this._isStartAppSet) throw "App is already started";
        enableDevMode(devMod);
        return this;
    }

    startApp(f: (jopi: JopiEasy) => void) {
        if (this._isStartAppSet) throw "App is already started";
        this._isStartAppSet = true;

        if (isDevMode()) redLogger("Executing in dev mode.");
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

        this.initialize();
    }

    protected initialize() {
        // Allow overriding init.
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

    hook_webSite(hook: (webSite: WebSite) => void) {
        this.internals.onHookWebSite = hook;
        return this;
    }

    DONE_createWebSite(): JopiApp {
        return jopiApp;
    }

    add_httpCertificate() {
        return new CertificateBuilder(this, this.internals);
    }

    add_jwtTokenAuth() {
        const builder = new JwtTokenAuth_Builder(this, this.internals);

        return {
            step_setPrivateKey: (privateKey: string) => builder.setPrivateKey_STEP(privateKey)
        }
    }

    add_path(path: string) {
        return new WebSiteContentBuilder(this, this.internals, path);
    }
}

class JopiEasyWebSite_ExposePrivate extends JopiEasyWebSite {
    getInternals() {
        return this.internals;
    }
}

class WebSiteContentBuilder {
    private requiredRoles?: string[];
    private verb?: HttpMethod;
    private handler?: (req: JopiRequest) => Promise<Response>;
    private wsHandler?: JopiWsRouteHandler;

    constructor(private readonly webSite: JopiEasyWebSite, private readonly internals: WebSiteInternal, private readonly path: string) {
        this.internals.afterHook.push(webSite => {
            if (this.handler) {

                let handler = this.handler;

                if (this.requiredRoles) {
                    const requiredRoles = this.requiredRoles;
                    const oldHandler = handler;

                    handler = req => {
                        req.assertUserHasRoles(requiredRoles);
                        return oldHandler(req);
                    }
                }

                webSite.onVerb(this.verb!, this.path, handler);
            }

            if (this.wsHandler) {
                webSite.onWebSocketConnect(this.path, this.wsHandler)
            }
        });
    }

    add_requiredRole(role: string) {
        if (!this.requiredRoles) this.requiredRoles = [role];
        else this.requiredRoles.push(role);
        return this;
    }

    add_requiredRoles(roles: string[]) {
        if (!this.requiredRoles) this.requiredRoles = [...roles];
        else this.requiredRoles = [...this.requiredRoles, ...roles];
        return this;
    }

    onRequest(verb: HttpMethod, handler: (req: JopiRequest) => Promise<Response>) {
        this.verb = verb;
        this.handler = handler;

        return {
            add_path: (path: string) => new WebSiteContentBuilder(this.webSite, this.internals, path),
            DONE_add_path: () => this.webSite
        }
    }

    onGET(handler: (req: JopiRequest) => Promise<Response>) {
        return this.onRequest("GET", handler);
    }

    onPOST(handler: (req: JopiRequest) => Promise<Response>) {
        return this.onRequest("POST", handler);
    }

    onPUT(handler: (req: JopiRequest) => Promise<Response>) {
        return this.onRequest("PUT", handler);
    }

    onDELETE(handler: (req: JopiRequest) => Promise<Response>) {
        return this.onRequest("DELETE", handler);
    }

    onOPTIONS(handler: (req: JopiRequest) => Promise<Response>) {
        return this.onRequest("OPTIONS", handler);
    }

    onPATCH(handler: (req: JopiRequest) => Promise<Response>) {
        return this.onRequest("PATCH", handler);
    }

    onHEAD(handler: (req: JopiRequest) => Promise<Response>) {
        return this.onRequest("HEAD", handler);
    }

    onWebSocketConnect(handler: JopiWsRouteHandler) {
        this.wsHandler = handler;

        return {
            add_path: (path: string) => new WebSiteContentBuilder(this.webSite, this.internals, path),
            DONE_add_path: () => this.webSite
        }
    }
}

//endregion

//region Server starting

let gIsAutoStartDone = false;

function autoStartServer() {
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
            this.targets.forEach(target => {
                let sf = target.compile();
                (webSite as WebSiteImpl).addSourceServer(sf);
            });

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

    private readonly targets: ReverseProxyTarget_ExposePrivate[] = [];

    add_target(url: string): ReverseProxyTarget {
        // Using ReverseProxyTarget2 but returning ReverseProxyTarget allow masking the private things.
        const target = new ReverseProxyTarget_ExposePrivate(this, url);
        this.targets.push(target);
        return target as ReverseProxyTarget;
    }

    DONE_new_reverseProxy() {
        return this.webSite;
    }
}

class ReverseProxyTarget {
    protected weight: number = 1;
    protected origin: string;
    protected hostName: string;
    protected publicUrl: string;

    constructor(private readonly parent: ReverseProxyBuilder, url: string) {
        const urlInfos = new URL(url);
        this.publicUrl = url;
        this.origin = urlInfos.origin;
        this.hostName = urlInfos.hostname;
    }

    DONE_add_target() {
        return this.parent;
    }

    useIp(ip: string) {
        let urlInfos = new URL(this.origin);
        urlInfos.host = ip;
        this.origin = urlInfos.href;

        return this;
    }

    setWeight(weight: number) {
        if (weight < 0) this.weight = 0;
        else if (weight > 1) this.weight = 1;
        else this.weight = weight;

        return this;
    }

    set_isMainServer() {
        this.weight = 1;
        return this;
    }

    set_isBackupServer() {
        this.weight = 0;
        return this;
    }
}

class ReverseProxyTarget_ExposePrivate extends ReverseProxyTarget {
    public compile(): ServerFetch<any> {
        let options: ServerFetchOptions<any> = {
            userDefaultHeaders: true,
            publicUrl: this.publicUrl
        };

        return ServerFetch.useOrigin(this.origin, this.hostName, options);
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
            onNotFound: req => req.error404Response()
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

    set_rootDir(rootDir: string) {
        this.options.rootDir = rootDir;
        return this;
    }

    set_onNotFound(handler: (req: JopiRequest) => Response|Promise<Response>) {
        this.options.onNotFound = handler;
        return this;
    }

    DONE_new_fileServer() {
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
    disable_tailwind() {
        setConfig_disableTailwind();
    }

    enable_devMode(value: boolean = true) {
        enableDevMode(value);
        return this;
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

const redLogger = NodeSpace.term.buildLogger(NodeSpace.term.B_RED);

//endregion