import { type AuthHandler, type HttpMethod, JopiRequest, type JopiWsRouteHandler, type UserInfos, type WebSite, WebSiteOptions } from "./core.ts";
import { type LetsEncryptParams, type OnTimeoutError } from "./letsEncrypt.ts";
import { UserStore_WithLoginPassword, type UserInfos_WithLoginPassword } from "./userStores.ts";
declare class JopiApp {
    private _isStartAppSet;
    globalConfig(): GlobalConfigBuilder;
    if_devMode(setDevMod?: boolean): DevModeConfigBuilder;
    startApp(f: (jopi: JopiEasy) => void): void;
}
declare class JopiEasy {
    new_webSite(url: string): JopiEasyWebSite;
    new_reverseProxy(url: string): ReverseProxyBuilder;
    new_fileServer(url: string): FileServerBuilder;
}
export declare const jopiApp: JopiApp;
declare class JopiEasyWebSite {
    protected readonly origin: string;
    protected readonly hostName: string;
    private webSite?;
    protected readonly options: WebSiteOptions;
    protected readonly afterHook: ((webSite: WebSite) => void)[];
    protected readonly beforeHook: (() => Promise<void>)[];
    protected readonly internals: WebSiteInternal;
    constructor(url: string);
    protected initialize(): void;
    private initWebSiteInstance;
    hook_webSite(hook: (webSite: WebSite) => void): this;
    DONE_createWebSite(): JopiApp;
    add_httpCertificate(): CertificateBuilder;
    add_jwtTokenAuth(): {
        step_setPrivateKey: (privateKey: string) => {
            step_setUserStore: () => {
                use_simpleLoginPassword: () => {
                    getStoreRef: (h: GetValue<UserStore_WithLoginPassword>) => /*elided*/ any;
                    addOne: (login: string, password: string, userInfos: UserInfos) => /*elided*/ any;
                    addMany: (users: UserInfos_WithLoginPassword[]) => /*elided*/ any;
                    DONE_use_simpleLoginPassword: () => {
                        stepOptional_setTokenStore: () => {
                            use_cookie: (expirationDuration_days?: number) => {
                                DONE_add_jwtTokenAuth: () => JopiEasyWebSite;
                            };
                            use_authentificationHeader: () => {
                                DONE_add_jwtTokenAuth: () => JopiEasyWebSite;
                            };
                        };
                        DONE_add_jwtTokenAuth: () => () => {
                            DONE_add_jwtTokenAuth: () => JopiEasyWebSite;
                        };
                    };
                };
                use_customStore<T>(store: AuthHandler<T>): {
                    DONE_use_customStore: () => {
                        stepOptional_setTokenStore: () => {
                            use_cookie: (expirationDuration_days?: number) => {
                                DONE_add_jwtTokenAuth: () => JopiEasyWebSite;
                            };
                            use_authentificationHeader: () => {
                                DONE_add_jwtTokenAuth: () => JopiEasyWebSite;
                            };
                        };
                        DONE_add_jwtTokenAuth: () => () => {
                            DONE_add_jwtTokenAuth: () => JopiEasyWebSite;
                        };
                    };
                };
            };
        };
    };
    add_path(path: string): WebSiteContentBuilder;
}
declare class JopiEasyWebSite_ExposePrivate extends JopiEasyWebSite {
    getInternals(): WebSiteInternal;
}
declare class WebSiteContentBuilder {
    private readonly webSite;
    private readonly internals;
    private readonly path;
    private requiredRoles?;
    private verb?;
    private handler?;
    private wsHandler?;
    constructor(webSite: JopiEasyWebSite, internals: WebSiteInternal, path: string);
    add_requiredRole(role: string): this;
    add_requiredRoles(roles: string[]): this;
    onRequest(verb: HttpMethod, handler: (req: JopiRequest) => Promise<Response>): {
        add_path: (path: string) => WebSiteContentBuilder;
        DONE_add_path: () => JopiEasyWebSite;
    };
    onGET(handler: (req: JopiRequest) => Promise<Response>): {
        add_path: (path: string) => WebSiteContentBuilder;
        DONE_add_path: () => JopiEasyWebSite;
    };
    onPOST(handler: (req: JopiRequest) => Promise<Response>): {
        add_path: (path: string) => WebSiteContentBuilder;
        DONE_add_path: () => JopiEasyWebSite;
    };
    onPUT(handler: (req: JopiRequest) => Promise<Response>): {
        add_path: (path: string) => WebSiteContentBuilder;
        DONE_add_path: () => JopiEasyWebSite;
    };
    onDELETE(handler: (req: JopiRequest) => Promise<Response>): {
        add_path: (path: string) => WebSiteContentBuilder;
        DONE_add_path: () => JopiEasyWebSite;
    };
    onOPTIONS(handler: (req: JopiRequest) => Promise<Response>): {
        add_path: (path: string) => WebSiteContentBuilder;
        DONE_add_path: () => JopiEasyWebSite;
    };
    onPATCH(handler: (req: JopiRequest) => Promise<Response>): {
        add_path: (path: string) => WebSiteContentBuilder;
        DONE_add_path: () => JopiEasyWebSite;
    };
    onHEAD(handler: (req: JopiRequest) => Promise<Response>): {
        add_path: (path: string) => WebSiteContentBuilder;
        DONE_add_path: () => JopiEasyWebSite;
    };
    onWebSocketConnect(handler: JopiWsRouteHandler): {
        add_path: (path: string) => WebSiteContentBuilder;
        DONE_add_path: () => JopiEasyWebSite;
    };
}
declare class ReverseProxyBuilder {
    private readonly webSite;
    private readonly internals;
    constructor(url: string);
    private readonly targets;
    add_target(url: string): ReverseProxyTarget;
    DONE_new_reverseProxy(): JopiEasyWebSite_ExposePrivate;
}
declare class ReverseProxyTarget {
    private readonly parent;
    protected weight: number;
    protected origin: string;
    protected hostName: string;
    protected publicUrl: string;
    constructor(parent: ReverseProxyBuilder, url: string);
    DONE_add_target(): ReverseProxyBuilder;
    useIp(ip: string): this;
    setWeight(weight: number): this;
    set_isMainServer(): this;
    set_isBackupServer(): this;
}
declare class FileServerBuilder {
    private readonly webSite;
    private readonly internals;
    private readonly options;
    constructor(url: string);
    set_rootDir(rootDir: string): this;
    set_onNotFound(handler: (req: JopiRequest) => Response | Promise<Response>): this;
    DONE_new_fileServer(): JopiEasyWebSite_ExposePrivate;
}
declare class CertificateBuilder {
    private readonly parent;
    private readonly internals;
    constructor(parent: JopiEasyWebSite, internals: WebSiteInternal);
    generate_localDevCert(saveInDir?: string): {
        DONE_add_httpCertificate: () => JopiEasyWebSite;
    };
    use_dirStore(dirPath: string): {
        DONE_add_httpCertificate: () => JopiEasyWebSite;
    };
    generate_letsEncryptCert(email: string): LetsEncryptCertificateBuilder;
}
declare class LetsEncryptCertificateBuilder {
    private readonly parent;
    private readonly params;
    constructor(parent: JopiEasyWebSite, params: LetsEncryptParams);
    DONE_add_httpCertificate(): JopiEasyWebSite;
    enable_production(value?: boolean): this;
    disable_log(): this;
    set_certificateDir(dirPath: string): this;
    force_expireAfter_days(dayCount: number): this;
    force_timout_sec(value: number): this;
    if_timeOutError(handler: OnTimeoutError): this;
}
declare class GlobalConfigBuilder {
    disable_tailwind(): void;
    enable_devMode(value?: boolean): this;
}
declare class DevModeConfigBuilder {
    disable_refreshBrowserOnSourceChange(): this;
    disable_restartServerOnSourceChange(): this;
    add_directoryToWatch(dirPath: string): this;
    set_restartDelay(delay_ms: number, enableLogs?: boolean): this;
}
type GetValue<T> = (value: T) => void;
interface WebSiteInternal {
    origin: string;
    hostName: string;
    options: WebSiteOptions;
    afterHook: ((webSite: WebSite) => void)[];
    beforeHook: (() => Promise<void>)[];
    onHookWebSite?: (webSite: WebSite) => void;
}
export {};
