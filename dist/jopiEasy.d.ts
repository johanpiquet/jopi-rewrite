import { type AuthHandler, JopiRequest, type UserInfos, WebSite, WebSiteOptions } from "./core.ts";
import { type LetsEncryptParams, type OnTimeoutError } from "./letsEncrypt.ts";
import { UserStore_WithLoginPassword, type UserInfos_WithLoginPassword } from "./userStores.js";
declare class JopiEasy {
    new_webSite(url: string): JopiEasy_CoreWebSite;
    new_reverseProxy(url: string): ReverseProxyBuilder;
    new_fileServer(url: string): FileServerBuilder;
}
export declare const jopiEasy: JopiEasy;
interface CoreWebSiteInternal {
    origin: string;
    hostName: string;
    options: WebSiteOptions;
    afterHook: ((webSite: WebSite) => void)[];
    beforeHook: (() => Promise<void>)[];
    onHookWebSite?: (webSite: WebSite) => void;
}
type GetValue<T> = (value: T) => void;
declare class JopiEasy_CoreWebSite {
    protected readonly origin: string;
    protected readonly hostName: string;
    private webSite?;
    protected readonly options: WebSiteOptions;
    protected readonly afterHook: ((webSite: WebSite) => void)[];
    protected readonly beforeHook: (() => Promise<void>)[];
    protected readonly internals: CoreWebSiteInternal;
    constructor(url: string);
    protected initialize(): void;
    private initWebSiteInstance;
    hook_webSite(hook: (webSite: WebSite) => void): this;
    DONE_createWebSite(): JopiEasy;
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
                                DONE_add_jwtTokenAuth: () => JopiEasy_CoreWebSite;
                            };
                            use_authentificationHeader: () => {
                                DONE_add_jwtTokenAuth: () => JopiEasy_CoreWebSite;
                            };
                        };
                        DONE_add_jwtTokenAuth: () => () => {
                            DONE_add_jwtTokenAuth: () => JopiEasy_CoreWebSite;
                        };
                    };
                };
                use_customStore<T>(store: AuthHandler<T>): {
                    DONE_use_customStore: () => {
                        stepOptional_setTokenStore: () => {
                            use_cookie: (expirationDuration_days?: number) => {
                                DONE_add_jwtTokenAuth: () => JopiEasy_CoreWebSite;
                            };
                            use_authentificationHeader: () => {
                                DONE_add_jwtTokenAuth: () => JopiEasy_CoreWebSite;
                            };
                        };
                        DONE_add_jwtTokenAuth: () => () => {
                            DONE_add_jwtTokenAuth: () => JopiEasy_CoreWebSite;
                        };
                    };
                };
            };
        };
    };
}
declare class JopiEasy_CoreWebSite2 extends JopiEasy_CoreWebSite {
    getInternals(): CoreWebSiteInternal;
}
declare class ReverseProxyTarget<T> {
    private readonly parent;
    protected weight: number;
    protected origin: string;
    protected hostName: string;
    protected publicUrl: string;
    constructor(parent: T, url: string);
    DONE_add_target(): T;
    useIp(ip: string): this;
    setWeight(weight: number): this;
    set_isMainServer(): this;
    set_isBackupServer(): this;
}
declare class ReverseProxyBuilder {
    private readonly webSite;
    private readonly internals;
    constructor(url: string);
    private readonly targets;
    add_target(url: string): ReverseProxyTarget<ReverseProxyBuilder>;
    DONE_new_reverseProxy(): JopiEasy_CoreWebSite2;
}
declare class FileServerBuilder {
    private readonly webSite;
    private readonly internals;
    private readonly options;
    constructor(url: string);
    set_rootDir(rootDir: string): this;
    set_onNotFound(handler: (req: JopiRequest) => Response | Promise<Response>): this;
    DONE_new_fileServer(): JopiEasy_CoreWebSite2;
}
declare class CertificateBuilder {
    private readonly parent;
    private readonly internals;
    constructor(parent: JopiEasy_CoreWebSite, internals: CoreWebSiteInternal);
    generate_localDevCert(saveInDir?: string): {
        DONE_add_httpCertificate: () => JopiEasy_CoreWebSite;
    };
    use_dirStore(dirPath: string): {
        DONE_add_httpCertificate: () => JopiEasy_CoreWebSite;
    };
    generate_letsEncryptCert(email: string): LetsEncryptCertificateBuilder;
}
declare class LetsEncryptCertificateBuilder {
    private readonly parent;
    private readonly params;
    constructor(parent: JopiEasy_CoreWebSite, params: LetsEncryptParams);
    DONE_add_httpCertificate(): JopiEasy_CoreWebSite;
    enable_production(value?: boolean): this;
    disable_log(): this;
    set_certificateDir(dirPath: string): this;
    force_expireAfter_days(dayCount: number): this;
    force_timout_sec(value: number): this;
    if_timeOutError(handler: OnTimeoutError): this;
}
export {};
