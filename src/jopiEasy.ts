// noinspection JSUnusedGlobalSymbols

import {HTTP_VERBS, JopiRequest, type JopiRouteHandler, JopiServer, WebSite, WebSiteOptions} from "./core.ts";
import path from "node:path";
import fsc from "node:fs";
import {ServerFetch, type ServerFetchOptions} from "./serverFetch.ts";
import {getLetsEncryptCertificate, type LetsEncryptParams, type OnTimeoutError} from "./letsEncrypt.ts";

interface OnlyDone<T> {
    done(): T
}

class JopiEasy {
    new_webSite(url: string): JopiEasy_CoreWebSite {
        return new JopiEasy_CoreWebSite(url);
    }

    new_reverseProxy(url: string): JopiEasy_ReverseProxy {
        return new JopiEasy_ReverseProxy(url);
    }

    new_fileServer(url: string): FileServerBuilder<JopiEasy_CoreWebSite> {
        const w = new JopiEasy_FileServerBuilder(url);
        return w.add_fileServer();
    }
}

export const jopiEasy = new JopiEasy();

interface CoreWebSiteInternal {
    origin: string;
    hostName: string;
    options: WebSiteOptions;

    afterHook: ((webSite: WebSite) => void)[];
    beforeHook: (() => Promise<void>)[];

    onHookWebSite?: (webSite: WebSite) => void;
}

class JopiEasy_CoreWebSite {
    protected readonly origin: string;
    protected readonly hostName: string;
    private webSite?: WebSite;
    protected readonly options: WebSiteOptions = {};

    protected readonly afterHook: ((webSite: WebSite)=>void)[] = [];
    protected readonly beforeHook: (()=>Promise<void>)[] = [];

    protected readonly internals: CoreWebSiteInternal;

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
            this.webSite = new WebSite(this.origin, this.options);
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

    done(): JopiEasy {
        return jopiEasy;
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
}

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

class ReverseProxyTarget<T> {
    protected weight: number = 1;
    protected origin: string;
    protected hostName: string;
    protected publicUrl: string;

    constructor(private readonly parent: T, url: string) {
        const urlInfos = new URL(url);
        this.publicUrl = url;
        this.origin = urlInfos.origin;
        this.hostName = urlInfos.hostname;
    }

    done() {
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

class ReverseProxyTarget2<T> extends ReverseProxyTarget<T> {
    public compile(): ServerFetch<any> {
        let options: ServerFetchOptions<any> = {
            userDefaultHeaders: true,
            publicUrl: this.publicUrl
        };

        return ServerFetch.useOrigin(this.origin, this.hostName, options);
    }
}

class JopiEasy_ReverseProxy extends JopiEasy_CoreWebSite {
    private readonly targets: ReverseProxyTarget2<JopiEasy_ReverseProxy>[] = [];

    protected override initialize() {
        this.afterHook.push(webSite => {
            this.targets.forEach(target => {
                let sf = target.compile();
                webSite.addSourceServer(sf);
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

    add_target(url: string): ReverseProxyTarget<JopiEasy_ReverseProxy> {
        const target = new ReverseProxyTarget2<JopiEasy_ReverseProxy>(this, url);
        this.targets.push(target);
        return target as ReverseProxyTarget<JopiEasy_ReverseProxy>;
    }
}

//endregion

//region File server

interface FileServerOptions {
    rootDir: string;
    replaceIndexHtml: boolean,
    onNotFound: (req: JopiRequest) => Response|Promise<Response>
}

class JopiEasy_FileServerBuilder extends JopiEasy_CoreWebSite {
    add_fileServer() {
        const options: FileServerOptions = {
            rootDir: "www",
            replaceIndexHtml: true,
            onNotFound:  req => req.error404Response()
        };

        this.afterHook.push(webSite => {
            webSite.onGET("/**", req => {
                return req.serveFile(options.rootDir, {
                    replaceIndexHtml: options.replaceIndexHtml,
                    onNotFound: options.onNotFound
                });
            });
        });

        return new FileServerBuilder<JopiEasy_CoreWebSite>(this, this.internals, options);
    }
}

class FileServerBuilder<T> {
    constructor(private readonly parent: T, private readonly internals: CoreWebSiteInternal, private readonly options: FileServerOptions ) {
    }

    done(): T {
        return this.parent;
    }

    webSite() {
        return this.parent;
    }

    set_rootDir(rootDir: string) {
        this.options.rootDir = rootDir;
        return this;
    }

    set_onNotFound(handler: (req: JopiRequest) => Response|Promise<Response>) {
        this.options.onNotFound = handler;
        return this;
    }
}

//endregion

//region TLS Certificats

//region CertificateBuilder

class CertificateBuilder<T> {
    constructor(private readonly parent: T, private readonly internals: CoreWebSiteInternal) {
    }

    done(): T {
        return this.parent;
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

        return this as OnlyDone<T>;
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
        return this as OnlyDone<T>;
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

class LetsEncryptCertificateBuilder<T> {
    constructor(private readonly parent: T, private readonly params: LetsEncryptParams) {
    }

    done() {
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

export interface UserInfos {
    userId: string;
    [key: string]: any;
}

export interface UserInfos_WithLoginPassword extends UserInfos {
    login: string;
    password: string;
}

type JwtTokenCustomStore = (login: string, password: string, passwordHash: string) => Promise<UserInfos|undefined|null|void>;

class JwtTokenAuth_Builder {
    private privateKey?: string;

    constructor(private readonly parent: JopiEasy_CoreWebSite, private readonly internals: CoreWebSiteInternal) {
    }

    FINISH() {
        return {
            DONE_add_jwtTokenAuth: () => this.parent
        }
    }

    //region setPrivateKey_STEP (BEGIN / root)

    setPrivateKey_STEP(privateKey: string) {
        this.privateKey = privateKey;

        return {
            step_setUserStore: () => this.setUserStore_STEP()
        }
    }

    //endregion

    //region setUserStore_STEP

    setUserStore_STEP() {
        return {
            use_simpleLoginPassword: () => this.useSimpleLoginPassword_BEGIN(),
            use_customStore: (store: JwtTokenCustomStore) => this.useCustomStore_BEGIN(store)
        }
    }

    _setUserStore_NEXT() {
        return {
            stepOptional_setTokenStore: () => this.setTokenStore_STEP(),
            DONE_add_jwtTokenAuth: () => this.FINISH,
        }
    }

    //region useCustomStore

    useCustomStore_BEGIN(store: JwtTokenCustomStore) {
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
            addOne: (login: string, password: string, userInfos?: UserInfos) => this.useSimpleLoginPassword_addOne(login, password, userInfos),
            addMany: (users: UserInfos_WithLoginPassword[]) => this.useSimpleLoginPassword_addMany(users),
            DONE_use_simpleLoginPassword: () => this.useSimpleLoginPassword_DONE()
        }
    }

    useSimpleLoginPassword_addOne(login: string, password: string, userInfos?: UserInfos) {
        //TODO

        return this._useSimpleLoginPassword_REPEAT();
    }

    useSimpleLoginPassword_addMany(users: UserInfos_WithLoginPassword[]) {
        //TODO

        return this._useSimpleLoginPassword_REPEAT();
    }

    //endregion

    //endregion

    //region setTokenStore

    setTokenStore_STEP() {
        return {
            use_cookie: (name: string, expirationDuration_days: number = 3600) => this.setTokenStore_useCookie(name, expirationDuration_days),
            use_authentificationHeader: () => this.setTokenStore_useAuthentificationHeader()
        }
    }

    setTokenStore_useCookie(name: string, expirationDuration_days: number = 3600) {
        return this.FINISH();
    }

    setTokenStore_useAuthentificationHeader() {
        return this.FINISH();
    }

    //endregion
}

class GoToWebSite<T> {
    constructor(private readonly parent: T) { }
    goTo_webSite() { return this.parent; }
}

//endregion