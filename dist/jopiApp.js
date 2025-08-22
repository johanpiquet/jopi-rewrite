// noinspection JSUnusedGlobalSymbols
import { enableDevMode, HTTP_VERBS, isDevMode, JopiRequest, JopiServer, WebSite, WebSiteOptions } from "./core.js";
import path from "node:path";
import fsc from "node:fs";
import { ServerFetch } from "./serverFetch.js";
import { getLetsEncryptCertificate } from "./letsEncrypt.js";
import { UserStore_WithLoginPassword } from "./userStores.js";
import { setConfig_disableTailwind } from "./hydrate.js";
import SourceChangesWatcher from "./tools/sourceChangesWatcher.js";
class JopiApp {
    _isStartAppSet = false;
    globalConfig() {
        if (this._isStartAppSet)
            throw "App is already started";
        return new GlobalConfigBuilder();
    }
    if_devMode(setDevMod) {
        if (this._isStartAppSet)
            throw "App is already started";
        if (setDevMod !== undefined) {
            enableDevMode(setDevMod);
        }
        return new DevModeConfigBuilder();
    }
    startApp(f) {
        if (this._isStartAppSet)
            throw "App is already started";
        this._isStartAppSet = true;
        if (gMustCancelDelayedTask)
            return;
        setTimeout(() => {
            if (gMustCancelDelayedTask)
                return;
            if (isDevMode()) {
                redLogger("Executing in dev mode. File change watching is enabled.");
            }
            f(new JopiEasy());
        }, 1);
    }
}
class JopiEasy {
    new_webSite(url) {
        return new JopiEasyWebSite(url);
    }
    new_reverseProxy(url) {
        return new ReverseProxyBuilder(url);
    }
    new_fileServer(url) {
        return new FileServerBuilder(url);
    }
}
export const jopiApp = new JopiApp();
//region WebSite
class JopiEasyWebSite {
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
        if (gMustCancelDelayedTask)
            return;
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
        return jopiApp;
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
    add_path(path) {
        return new WebSiteContentBuilder(this, this.internals, path);
    }
}
class JopiEasyWebSite_ExposePrivate extends JopiEasyWebSite {
    getInternals() {
        return this.internals;
    }
}
class WebSiteContentBuilder {
    webSite;
    internals;
    path;
    requiredRoles;
    verb;
    handler;
    wsHandler;
    constructor(webSite, internals, path) {
        this.webSite = webSite;
        this.internals = internals;
        this.path = path;
        this.internals.afterHook.push(webSite => {
            if (this.handler) {
                let handler = this.handler;
                if (this.requiredRoles) {
                    const requiredRoles = this.requiredRoles;
                    const oldHandler = handler;
                    handler = req => {
                        req.assertUserHasRoles(requiredRoles);
                        return oldHandler(req);
                    };
                }
                webSite.onVerb(this.verb, this.path, handler);
            }
            if (this.wsHandler) {
                webSite.onWebSocketConnect(this.path, this.wsHandler);
            }
        });
    }
    add_requiredRole(role) {
        if (!this.requiredRoles)
            this.requiredRoles = [role];
        else
            this.requiredRoles.push(role);
        return this;
    }
    add_requiredRoles(roles) {
        if (!this.requiredRoles)
            this.requiredRoles = [...roles];
        else
            this.requiredRoles = [...this.requiredRoles, ...roles];
        return this;
    }
    onRequest(verb, handler) {
        this.verb = verb;
        this.handler = handler;
        return {
            add_path: (path) => new WebSiteContentBuilder(this.webSite, this.internals, path),
            DONE_add_path: () => this.webSite
        };
    }
    onGET(handler) {
        return this.onRequest("GET", handler);
    }
    onPOST(handler) {
        return this.onRequest("POST", handler);
    }
    onPUT(handler) {
        return this.onRequest("PUT", handler);
    }
    onDELETE(handler) {
        return this.onRequest("DELETE", handler);
    }
    onOPTIONS(handler) {
        return this.onRequest("OPTIONS", handler);
    }
    onPATCH(handler) {
        return this.onRequest("PATCH", handler);
    }
    onHEAD(handler) {
        return this.onRequest("HEAD", handler);
    }
    onWebSocketConnect(handler) {
        this.wsHandler = handler;
        return {
            add_path: (path) => new WebSiteContentBuilder(this.webSite, this.internals, path),
            DONE_add_path: () => this.webSite
        };
    }
}
//endregion
//region Server starting
let gIsAutoStartDone = false;
function autoStartServer() {
    if (gIsAutoStartDone)
        return;
    gIsAutoStartDone = true;
    setTimeout(() => {
        if (gMustCancelDelayedTask)
            return;
        myServer.startServer();
    }, 5);
}
const myServer = new JopiServer();
//endregion
//region Reverse proxy
class ReverseProxyBuilder {
    webSite;
    internals;
    constructor(url) {
        this.webSite = new JopiEasyWebSite_ExposePrivate(url);
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
        // Using ReverseProxyTarget2 but returning ReverseProxyTarget allow masking the private things.
        const target = new ReverseProxyTarget_ExposePrivate(this, url);
        this.targets.push(target);
        return target;
    }
    DONE_new_reverseProxy() {
        return this.webSite;
    }
}
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
class ReverseProxyTarget_ExposePrivate extends ReverseProxyTarget {
    compile() {
        let options = {
            userDefaultHeaders: true,
            publicUrl: this.publicUrl
        };
        return ServerFetch.useOrigin(this.origin, this.hostName, options);
    }
}
class FileServerBuilder {
    webSite;
    internals;
    options;
    constructor(url) {
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
            webSite.setJwtTokenStore((token, _cookieValue, _req, res) => {
                res.headers.set("Authorization", `Bearer ${token}`);
            });
        });
        return this.FINISH();
    }
}
//endregion
//region Config
class GlobalConfigBuilder {
    disable_tailwind() {
        setConfig_disableTailwind();
    }
    enable_devMode(value = true) {
        enableDevMode(value);
        return this;
    }
}
class DevModeConfigBuilder {
    enable_refreshBrowserOnSourceChange(delay_ms = 300) {
        //this.watcher.setDelay(delay_ms);
        return this;
    }
    enable_restartServerOnSourceChange(delay_ms = 300) {
        // We are not in the main process, but a child spawned.
        if (gIsRestartSpawn)
            return this;
        // Is already called.
        if (gMustCancelDelayedTask)
            return this;
        // Will avoid the app to start.
        //      Why? Because this process becomes the controller.
        //      He must keep things minimal and avoid binding to external resources (ports).
        //
        // Using a controller allows not killing/replacing this process.
        // It's important, since without that the IDE can't kill the app.
        //
        gMustCancelDelayedTask = true;
        gWatcher.setDelay(delay_ms);
        gWatcher.start().then();
        return this;
    }
    add_directoryToWatch(dirPath) {
        dirPath = path.resolve(dirPath);
        gWatcher.addWatchDir(dirPath);
        return this;
    }
}
//endregion
//region Auto restart
/**
 * Is set to true when watching is enabled.
 * When it's the case, then we avoid all port binding.
 */
let gMustCancelDelayedTask = false;
let gWatcher = new SourceChangesWatcher();
/**
 * jopi_is_restart_spawn is set by the controller process
 * for the child they are creating. Then, if he is set, it means
 * the restarted has created this process and control him.
 */
const gIsRestartSpawn = process.env["jopi_is_restart_spawn"];
const redLogger = NodeSpace.term.buildLogger(NodeSpace.term.B_RED);
//endregion
//# sourceMappingURL=jopiApp.js.map