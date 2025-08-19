import { HTTP_VERBS, JopiRequest, JopiServer, WebSite, WebSiteOptions } from "./core.js";
import path from "node:path";
import fsc from "node:fs";
import { ServerFetch } from "./serverFetch.js";
class JopiEasy {
    new_webSite(url) {
        return new JopiEasy_WebSiteBuilder(url);
    }
    new_reverseProxy(url) {
        return new JopiEasy_ReverseProxy(url);
    }
    new_fileServer(url, rootDir) {
        const w = new JopiEasy_WebSiteBuilder(url);
        return w.add_fileServer(rootDir);
    }
}
class JopiEasy_CoreWebSite {
    origin;
    hostName;
    webSite;
    options = {};
    afterHook = [];
    beforeHook = [];
    internals;
    onHookWebSite;
    constructor(url) {
        setTimeout(() => { this.initWebSiteInstance().then(); }, 1);
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
    initialize() {
        // Allow overriding init.
    }
    async initWebSiteInstance() {
        if (!this.webSite) {
            for (let hook of this.beforeHook)
                await hook();
            this.webSite = new WebSite(this.origin, this.options);
            this.afterHook.forEach(c => c(this.webSite));
            myServer.addWebsite(this.webSite);
            autoStartServer();
        }
        if (this.onHookWebSite) {
            this.onHookWebSite(this.webSite);
        }
    }
    hook_webSite(hook) {
        this.onHookWebSite = hook;
        return this;
    }
    done() {
        return jopiEasy;
    }
    add_httpCertificate() {
        return new CertificateBuilder(this, this.internals);
    }
}
//region JopiEasy_WebSiteBuilder
class JopiEasy_WebSiteBuilder extends JopiEasy_CoreWebSite {
    add_fileServer(rootDir, options) {
        if (!options)
            options = {};
        if (options.replaceIndexHtml === undefined)
            options.replaceIndexHtml = true;
        if (!options.onNotFound)
            options.onNotFound = req => req.error404Response();
        this.afterHook.push(webSite => {
            webSite.onGET("/**", req => {
                return req.serveFile(rootDir, {
                    replaceIndexHtml: options.replaceIndexHtml,
                    onNotFound: options.onNotFound
                });
            });
        });
        return new FileServerBuilder(this);
    }
}
//endregion
//region JopiEasy_ReverseProxy
class ReverseProxyTarget {
    parent;
    weight = 1;
    origin;
    hostName;
    publicUrl;
    constructor(parent, url) {
        this.parent = parent;
        const urlInfos = new URL(url);
        this.publicUrl = url;
        this.origin = urlInfos.origin;
        this.hostName = urlInfos.hostname;
    }
    done() {
        return this.parent;
    }
    useIp(ip) {
        let urlInfos = new URL(this.origin);
        urlInfos.host = ip;
        this.origin = urlInfos.href;
        return this;
    }
    setWeight(weight) {
        if (weight < 0)
            this.weight = 0;
        else if (weight > 1)
            this.weight = 1;
        else
            this.weight = weight;
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
class ReverseProxyTarget2 extends ReverseProxyTarget {
    compile() {
        let options = {
            userDefaultHeaders: true,
            publicUrl: this.publicUrl
        };
        return ServerFetch.useOrigin(this.origin, this.hostName, options);
    }
}
class JopiEasy_ReverseProxy extends JopiEasy_CoreWebSite {
    targets = [];
    initialize() {
        this.afterHook.push(webSite => {
            this.targets.forEach(target => {
                let sf = target.compile();
                webSite.addSourceServer(sf);
            });
            const handler = req => {
                req.headers.set('X-Forwarded-Proto', req.urlInfos.protocol.replace(':', ''));
                req.headers.set('X-Forwarded-Host', req.urlInfos.host);
                const clientIp = req.coreServer.requestIP(req.coreRequest)?.address;
                req.headers.set("X-Forwarded-For", clientIp);
                return req.directProxyToServer();
            };
            HTTP_VERBS.forEach(verb => {
                webSite.onVerb(verb, "/**", handler);
            });
        });
    }
    add_target(url) {
        const target = new ReverseProxyTarget2(this, url);
        this.targets.push(target);
        return target;
    }
}
//endregion
//region FileServerBuilder
class FileServerBuilder {
    parent;
    constructor(parent) {
        this.parent = parent;
    }
    done() {
        return this.parent;
    }
}
//endregion
//region CertificateBuilder
class CertificateBuilder {
    parent;
    internals;
    constructor(parent, internals) {
        this.parent = parent;
        this.internals = internals;
    }
    done() {
        return this.parent;
    }
    forLocalDev(saveInDir = "certs") {
        this.internals.beforeHook.push(async () => {
            try {
                this.internals.options.certificate = await myServer.createDevCertificate(this.internals.hostName, saveInDir);
            }
            catch {
                console.error(`Can't create ssl certificate for ${this.internals.hostName}. Is mkcert tool installed ?`);
            }
        });
        return this;
    }
    fromDirPath(dirPath) {
        dirPath = path.join(dirPath, this.internals.hostName);
        let cert = "";
        let key = "";
        try {
            cert = path.resolve(dirPath, "certificate.crt.key");
            fsc.statfsSync(cert);
        }
        catch {
            console.error("Certificat file not found: ", cert);
        }
        try {
            key = path.resolve(dirPath, "certificate.key");
            fsc.statfsSync(key);
        }
        catch {
            console.error("Certificat key file not found: ", key);
        }
        this.internals.options.certificate = { key, cert };
        return this;
    }
}
//region Server
let gIsAutoStartDone = false;
function autoStartServer() {
    if (gIsAutoStartDone)
        return;
    gIsAutoStartDone = true;
    setTimeout(() => {
        myServer.startServer();
    }, 5);
}
const myServer = new JopiServer();
//endregion
export const jopiEasy = new JopiEasy();
//# sourceMappingURL=jopiEasy.js.map