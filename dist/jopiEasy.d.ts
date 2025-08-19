import { JopiRequest, WebSite, WebSiteOptions } from "./core.ts";
declare class JopiEasy {
    new_webSite(url: string): JopiEasy_WebSiteBuilder;
    new_reverseProxy(url: string): JopiEasy_ReverseProxy;
    new_fileServer(url: string, rootDir: string): FileServerBuilder<JopiEasy_CoreWebSite>;
}
interface CoreWebSiteInternal {
    origin: string;
    hostName: string;
    options: WebSiteOptions;
    afterHook: ((webSite: WebSite) => void)[];
    beforeHook: (() => Promise<void>)[];
}
declare class JopiEasy_CoreWebSite {
    protected readonly origin: string;
    protected readonly hostName: string;
    private webSite?;
    protected readonly options: WebSiteOptions;
    protected readonly afterHook: ((webSite: WebSite) => void)[];
    protected readonly beforeHook: (() => Promise<void>)[];
    protected readonly internals: CoreWebSiteInternal;
    private onHookWebSite?;
    constructor(url: string);
    protected initialize(): void;
    private initWebSiteInstance;
    hook_webSite(hook: (webSite: WebSite) => void): this;
    done(): JopiEasy;
    add_httpCertificate(): CertificateBuilder<this>;
}
declare class JopiEasy_WebSiteBuilder extends JopiEasy_CoreWebSite {
    add_fileServer(rootDir: string, options?: {
        replaceIndexHtml?: boolean;
        onNotFound?: (req: JopiRequest) => Response | Promise<Response>;
    }): FileServerBuilder<JopiEasy_CoreWebSite>;
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
declare class FileServerBuilder<T> {
    private readonly parent;
    constructor(parent: T);
    done(): T;
}
declare class CertificateBuilder<T extends JopiEasy_CoreWebSite> {
    private readonly parent;
    private readonly internals;
    constructor(parent: T, internals: CoreWebSiteInternal);
    done(): T;
    forLocalDev(saveInDir?: string): OnlyDone<T>;
    fromDirPath(dirPath: string): OnlyDone<T>;
}
interface OnlyDone<T> {
    done(): T;
}
export declare const jopiEasy: JopiEasy;
export {};
