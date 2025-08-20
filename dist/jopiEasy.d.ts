import { JopiRequest, WebSite, WebSiteOptions } from "./core.ts";
import { type LetsEncryptParams, type OnTimeoutError } from "./letsEncrypt.ts";
interface OnlyDone<T> {
    done(): T;
}
declare class JopiEasy {
    new_webSite(url: string): JopiEasy_CoreWebSite;
    new_reverseProxy(url: string): JopiEasy_ReverseProxy;
    new_fileServer(url: string): FileServerBuilder<JopiEasy_CoreWebSite>;
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
    done(): JopiEasy;
    add_httpCertificate(): CertificateBuilder<this>;
    add_jwtTokenAuth(): {
        step_setPrivateKey: (privateKey: string) => {
            step_setUserStore: () => {
                use_simpleLoginPassword: () => {
                    addOne: (login: string, password: string, userInfos?: UserInfos) => /*elided*/ any;
                    addMany: (users: UserInfos_WithLoginPassword[]) => /*elided*/ any;
                    DONE_use_simpleLoginPassword: () => {
                        stepOptional_setTokenStore: () => {
                            use_cookie: (name: string, expirationDuration_days?: number) => {
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
                use_customStore: (store: JwtTokenCustomStore) => {
                    DONE_use_customStore: () => {
                        stepOptional_setTokenStore: () => {
                            use_cookie: (name: string, expirationDuration_days?: number) => {
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
declare class ReverseProxyTarget<T> {
    private readonly parent;
    protected weight: number;
    protected origin: string;
    protected hostName: string;
    protected publicUrl: string;
    constructor(parent: T, url: string);
    done(): T;
    useIp(ip: string): this;
    setWeight(weight: number): this;
    set_isMainServer(): this;
    set_isBackupServer(): this;
}
declare class JopiEasy_ReverseProxy extends JopiEasy_CoreWebSite {
    private readonly targets;
    protected initialize(): void;
    add_target(url: string): ReverseProxyTarget<JopiEasy_ReverseProxy>;
}
interface FileServerOptions {
    rootDir: string;
    replaceIndexHtml: boolean;
    onNotFound: (req: JopiRequest) => Response | Promise<Response>;
}
declare class FileServerBuilder<T> {
    private readonly parent;
    private readonly internals;
    private readonly options;
    constructor(parent: T, internals: CoreWebSiteInternal, options: FileServerOptions);
    done(): T;
    webSite(): T;
    set_rootDir(rootDir: string): this;
    set_onNotFound(handler: (req: JopiRequest) => Response | Promise<Response>): this;
}
declare class CertificateBuilder<T> {
    private readonly parent;
    private readonly internals;
    constructor(parent: T, internals: CoreWebSiteInternal);
    done(): T;
    generate_localDevCert(saveInDir?: string): OnlyDone<T>;
    use_dirStore(dirPath: string): OnlyDone<T>;
    generate_letsEncryptCert(email: string): LetsEncryptCertificateBuilder<T>;
}
declare class LetsEncryptCertificateBuilder<T> {
    private readonly parent;
    private readonly params;
    constructor(parent: T, params: LetsEncryptParams);
    done(): T;
    enable_production(value?: boolean): this;
    disable_log(): this;
    set_certificateDir(dirPath: string): this;
    force_expireAfter_days(dayCount: number): this;
    force_timout_sec(value: number): this;
    if_timeOutError(handler: OnTimeoutError): this;
}
export interface UserInfos {
    userId: string;
    [key: string]: any;
}
export interface UserInfos_WithLoginPassword extends UserInfos {
    login: string;
    password: string;
}
type JwtTokenCustomStore = (login: string, password: string, passwordHash: string) => Promise<UserInfos | undefined | null | void>;
export {};
