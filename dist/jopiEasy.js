// noinspection JSUnusedGlobalSymbols
import { HTTP_VERBS, JopiRequest, JopiServer, WebSite, WebSiteOptions } from "./core.js";
import path from "node:path";
import fsc from "node:fs";
import { ServerFetch } from "./serverFetch.js";
import { getLetsEncryptCertificate } from "./letsEncrypt.js";
import { UserStore_WithLoginPassword } from "./userStores.js";
class JopiEasy {
    new_webSite(url) {
        return new JopiEasy_CoreWebSite(url);
    }
    new_reverseProxy(url) {
        return new ReverseProxyBuilder(url);
    }
    new_fileServer(url) {
        return new FileServerBuilder(url);
    }
}
export const jopiEasy = new JopiEasy();
class JopiEasy_CoreWebSite {
    origin;
    hostName;
    webSite;
    options = {};
    afterHook = [];
    beforeHook = [];
    internals;
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
        if (this.internals.onHookWebSite) {
            this.internals.onHookWebSite(this.webSite);
        }
    }
    hook_webSite(hook) {
        this.internals.onHookWebSite = hook;
        return this;
    }
    DONE_createWebSite() {
        return jopiEasy;
    }
    add_httpCertificate() {
        return new CertificateBuilder(this, this.internals);
    }
    add_jwtTokenAuth() {
        const builder = new JwtTokenAuth_Builder(this, this.internals);
        return {
            step_setPrivateKey: (privateKey) => builder.setPrivateKey_STEP(privateKey)
        };
    }
}
class JopiEasy_CoreWebSite2 extends JopiEasy_CoreWebSite {
    getInternals() {
        return this.internals;
    }
}
//region Server starting
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
//region Reverse proxy
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
    DONE_add_target() {
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
class ReverseProxyBuilder {
    webSite;
    internals;
    constructor(url) {
        this.webSite = new JopiEasy_CoreWebSite2(url);
        this.internals = this.webSite.getInternals();
        this.internals.afterHook.push(webSite => {
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
    targets = [];
    add_target(url) {
        const target = new ReverseProxyTarget2(this, url);
        this.targets.push(target);
        return target;
    }
    DONE_new_reverseProxy() {
        return this.webSite;
    }
}
class FileServerBuilder {
    webSite;
    internals;
    options;
    constructor(url) {
        this.webSite = new JopiEasy_CoreWebSite2(url);
        this.internals = this.webSite.getInternals();
        this.options = {
            rootDir: "www",
            replaceIndexHtml: true,
            onNotFound: req => req.error404Response()
        };
    }
    set_rootDir(rootDir) {
        this.options.rootDir = rootDir;
        return this;
    }
    set_onNotFound(handler) {
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
    parent;
    internals;
    constructor(parent, internals) {
        this.parent = parent;
        this.internals = internals;
    }
    generate_localDevCert(saveInDir = "certs") {
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
        };
    }
    use_dirStore(dirPath) {
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
        return {
            DONE_add_httpCertificate: () => this.parent
        };
    }
    generate_letsEncryptCert(email) {
        const params = { email };
        this.internals.afterHook.push(async (webSite) => {
            await getLetsEncryptCertificate(webSite, params);
        });
        return new LetsEncryptCertificateBuilder(this.parent, params);
    }
}
//endregion
//region LetsEncryptCertificateBuilder
class LetsEncryptCertificateBuilder {
    parent;
    params;
    constructor(parent, params) {
        this.parent = parent;
        this.params = params;
    }
    DONE_add_httpCertificate() {
        return this.parent;
    }
    enable_production(value = true) {
        this.params.isProduction = value;
        return this;
    }
    disable_log() {
        this.params.log = false;
        return this;
    }
    set_certificateDir(dirPath) {
        this.params.certificateDir = dirPath;
        return this;
    }
    force_expireAfter_days(dayCount) {
        this.params.expireAfter_days = dayCount;
        return this;
    }
    force_timout_sec(value) {
        this.params.timout_sec = value;
        return this;
    }
    if_timeOutError(handler) {
        this.params.onTimeoutError = handler;
        return this;
    }
}
//endregion
//endregion
//region JWT Tokens
class JwtTokenAuth_Builder {
    parent;
    internals;
    constructor(parent, internals) {
        this.parent = parent;
        this.internals = internals;
    }
    FINISH() {
        return {
            DONE_add_jwtTokenAuth: () => this.parent
        };
    }
    //region setPrivateKey_STEP (BEGIN / root)
    setPrivateKey_STEP(privateKey) {
        this.internals.afterHook.push(async (webSite) => {
            webSite.setJwtSecret(privateKey);
        });
        return {
            step_setUserStore: () => this.setUserStore_STEP()
        };
    }
    //endregion
    //region setUserStore_STEP
    loginPasswordStore;
    setUserStore_STEP() {
        const self = this;
        return {
            use_simpleLoginPassword: () => {
                this.loginPasswordStore = new UserStore_WithLoginPassword();
                this.internals.afterHook.push(webSite => {
                    this.loginPasswordStore.setAuthHandler(webSite);
                });
                return this.useSimpleLoginPassword_BEGIN();
            },
            use_customStore(store) { return self.useCustomStore_BEGIN(store); }
        };
    }
    _setUserStore_NEXT() {
        return {
            stepOptional_setTokenStore: () => this.setTokenStore_STEP(),
            DONE_add_jwtTokenAuth: () => this.FINISH,
        };
    }
    //region useCustomStore
    useCustomStore_BEGIN(store) {
        this.internals.afterHook.push(webSite => {
            webSite.setAuthHandler(store);
        });
        return {
            DONE_use_customStore: () => this.useCustomStore_DONE()
        };
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
            getStoreRef: (h) => {
                h(this.loginPasswordStore);
                return this._useSimpleLoginPassword_REPEAT();
            },
            addOne: (login, password, userInfos) => this.useSimpleLoginPassword_addOne(login, password, userInfos),
            addMany: (users) => this.useSimpleLoginPassword_addMany(users),
            DONE_use_simpleLoginPassword: () => this.useSimpleLoginPassword_DONE()
        };
    }
    useSimpleLoginPassword_addOne(login, password, userInfos) {
        this.loginPasswordStore.add({ login, password, userInfos });
        return this._useSimpleLoginPassword_REPEAT();
    }
    useSimpleLoginPassword_addMany(users) {
        users.forEach(e => this.loginPasswordStore.add(e));
        return this._useSimpleLoginPassword_REPEAT();
    }
    //endregion
    //endregion
    //region setTokenStore
    setTokenStore_STEP() {
        return {
            use_cookie: (expirationDuration_days = 3600) => this.setTokenStore_useCookie(expirationDuration_days),
            use_authentificationHeader: () => this.setTokenStore_useAuthentificationHeader()
        };
    }
    setTokenStore_useCookie(expirationDuration_days = 3600) {
        this.internals.afterHook.push(webSite => {
            webSite.setJwtTokenStore((_token, cookieValue, req, res) => {
                req.addCookie(res, "authorization", cookieValue, { maxAge: NodeSpace.timer.ONE_DAY * expirationDuration_days });
            });
        });
        return this.FINISH();
    }
    setTokenStore_useAuthentificationHeader() {
        this.internals.afterHook.push(webSite => {
            webSite.setJwtTokenStore((token, _cookieValue, req, res) => {
                res.headers.set("Authorization", `Bearer ${token}`);
            });
        });
        return this.FINISH();
    }
}
class GoToWebSite {
    parent;
    constructor(parent) {
        this.parent = parent;
    }
    goTo_webSite() { return this.parent; }
}
//endregion
//# sourceMappingURL=jopiEasy.js.map