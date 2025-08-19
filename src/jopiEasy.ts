import {HTTP_VERBS, JopiRequest, type JopiRouteHandler, JopiServer, WebSite, WebSiteOptions} from "./core.ts";
import path from "node:path";
import fsc from "node:fs";
import {ServerFetch, type ServerFetchOptions} from "./serverFetch.ts";

class JopiEasy {
    new_webSite(url: string): JopiEasy_WebSiteBuilder {
        return new JopiEasy_WebSiteBuilder(url);
    }

    new_reverseProxy(url: string): JopiEasy_ReverseProxy {
        return new JopiEasy_ReverseProxy(url);
    }

    new_fileServer(url: string, rootDir: string): FileServerBuilder<JopiEasy_CoreWebSite> {
        const w = new JopiEasy_WebSiteBuilder(url);
        return w.add_fileServer(rootDir);
    }
}

interface CoreWebSiteInternal {
    origin: string;
    hostName: string;
    options: WebSiteOptions;

    afterHook: ((webSite: WebSite) => void)[];
    beforeHook: (() => Promise<void>)[];
}

class JopiEasy_CoreWebSite {
    protected readonly origin: string;
    protected readonly hostName: string;
    private webSite?: WebSite;
    protected readonly options: WebSiteOptions = {};

    protected readonly afterHook: ((webSite: WebSite)=>void)[] = [];
    protected readonly beforeHook: (()=>Promise<void>)[] = [];

    protected readonly internals: CoreWebSiteInternal;

    private onHookWebSite?: (webSite: WebSite) => void;

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

        if (this.onHookWebSite) {
            this.onHookWebSite(this.webSite);
        }
    }

    hook_webSite(hook: (webSite: WebSite) => void) {
        this.onHookWebSite = hook;
        return this;
    }

    done(): JopiEasy {
        return jopiEasy;
    }

    add_httpCertificate() {
        return new CertificateBuilder(this, this.internals);
    }
}

//region JopiEasy_WebSiteBuilder

class JopiEasy_WebSiteBuilder extends JopiEasy_CoreWebSite {
    add_fileServer(rootDir: string, options?: {
        replaceIndexHtml?: boolean,
        onNotFound?: (req: JopiRequest) => Response|Promise<Response>
    }) {
        if (!options) options = {};
        if (options.replaceIndexHtml===undefined) options.replaceIndexHtml = true;
        if (!options.onNotFound) options.onNotFound = req => req.error404Response();

        this.afterHook.push(webSite => {
            webSite.onGET("/**", req => {
                return req.serveFile(rootDir, {
                    replaceIndexHtml: options.replaceIndexHtml,
                    onNotFound: options.onNotFound
                });
            });
        });

        return new FileServerBuilder<JopiEasy_CoreWebSite>(this);
    }
}

//endregion

//region JopiEasy_ReverseProxy

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

//region FileServerBuilder

class FileServerBuilder<T> {
    constructor(private readonly parent: T) {
    }

    done(): T {
        return this.parent;
    }
}

//endregion

//region CertificateBuilder

class CertificateBuilder<T extends JopiEasy_CoreWebSite> {
    constructor(private readonly parent: T, private readonly internals: CoreWebSiteInternal) {
    }

    done(): T {
        return this.parent;
    }

    forLocalDev(saveInDir: string = "certs") {
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

    fromDirPath(dirPath: string) {
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
}

//endregion

interface OnlyDone<T> {
    done(): T
}

//region Server

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

export const jopiEasy = new JopiEasy();