// noinspection JSUnusedGlobalSymbols
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
import { JopiRequest } from "./jopiRequest.tsx";
import { LoadBalancer } from "./loadBalancing.ts";
import { PostMiddlewares } from "./middlewares/index.ts";
import jwt from "jsonwebtoken";
import { ModuleInitContext } from "jopi-rewrite/ui";
import { VoidPageCache } from "./caches/cache.ts";
import { ONE_DAY } from "./publicTools.ts";
import { getInMemoryCache } from "./caches/InMemoryCache.ts";
import { installBundleServer } from "./bundler/server.ts";
import { createBundle } from "./bundler/bundler.ts";
import * as jk_webSocket from "jopi-toolkit/jk_webSocket";
import * as jk_events from "jopi-toolkit/jk_events";
import { installBrowserRefreshSseEvent, isBrowserRefreshEnabled } from "jopi-rewrite/loader-client";
import { executeBrowserInstall } from "./linker.ts";
import { getNewServerInstanceBuilder } from "./serverInstanceBuilder.ts";
import { PriorityLevel, sortByPriority } from "jopi-toolkit/jk_tools";
var WebSiteImpl = /** @class */ (function () {
    function WebSiteImpl(url, options) {
        this.isHttps = false;
        this.globalMiddlewares = {};
        this.globalPostMiddlewares = {};
        this.data = {};
        this.loadBalancer = new LoadBalancer();
        this.events = jk_events.defaultEventGroup;
        this.mustUseAutomaticCache = true;
        this.cacheRules = [];
        this.headersToCache = ["content-type", "etag", "last-modified"];
        this.allRouteInfos = {};
        if (!options)
            options = {};
        url = url.trim().toLowerCase();
        this.welcomeUrl = url;
        this.certificate = options.certificate;
        var urlInfos = new URL(url);
        this.welcomeUrl = urlInfos.protocol + "//" + urlInfos.hostname;
        if (urlInfos.protocol === "https:")
            this.isHttps = true;
        else if (urlInfos.protocol !== "http:")
            throw new Error("invalid url");
        if (urlInfos.port) {
            this.port = parseInt(urlInfos.port);
            this.welcomeUrl += ':' + this.port;
        }
        else {
            if (this.isHttps)
                this.port = 443;
            else
                this.port = 80;
        }
        this.host = urlInfos.host;
        this.mainCache = options.cache || getInMemoryCache();
        this.serverInstanceBuilder = getNewServerInstanceBuilder(this);
        this._onWebSiteReady = options.onWebSiteReady;
        // Allow hooking the newly created websites.
        jk_events.sendEvent("jopi.webSite.created", this);
    }
    WebSiteImpl.prototype.getWelcomeUrl = function () {
        return this.welcomeUrl;
    };
    WebSiteImpl.prototype.processRequest = function (handler, urlParts, routeInfos, urlInfos, coreRequest, coreServer) {
        return __awaiter(this, void 0, void 0, function () {
            var req, e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // For security reasons. Without that, an attacker can break a cache.
                        if (urlInfos)
                            urlInfos.hash = "";
                        req = new JopiRequest(this, urlInfos, coreRequest, coreServer, routeInfos);
                        req.urlParts = urlParts;
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 4, , 10]);
                        if (!handler) return [3 /*break*/, 3];
                        return [4 /*yield*/, handler(req)];
                    case 2: return [2 /*return*/, _a.sent()];
                    case 3: return [2 /*return*/, req.returnError404_NotFound()];
                    case 4:
                        e_1 = _a.sent();
                        if (!(e_1 instanceof SBPE_ServerByPassException)) return [3 /*break*/, 9];
                        if (!(e_1 instanceof SBPE_DirectSendThisResponseException)) return [3 /*break*/, 8];
                        if (!(e_1.response instanceof Response)) return [3 /*break*/, 5];
                        return [2 /*return*/, e_1.response];
                    case 5: return [4 /*yield*/, e_1.response(req)];
                    case 6: return [2 /*return*/, _a.sent()];
                    case 7: return [3 /*break*/, 9];
                    case 8:
                        if (e_1 instanceof SBPE_NotAuthorizedException) {
                            return [2 /*return*/, req.textResponse(e_1.message, 401)];
                        }
                        else if (e_1 instanceof SBPE_MustReturnWithoutResponseException) {
                            return [2 /*return*/, undefined];
                        }
                        _a.label = 9;
                    case 9:
                        console.error(e_1);
                        return [2 /*return*/, this.return500(req, e_1)];
                    case 10: return [2 /*return*/];
                }
            });
        });
    };
    WebSiteImpl.prototype.onBeforeServerStart = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, jk_events.sendAsyncEvent("jopi.server.before.start", { webSite: this })];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, createBundle(this)];
                    case 2:
                        _a.sent();
                        installBundleServer(this);
                        return [2 /*return*/];
                }
            });
        });
    };
    WebSiteImpl.prototype.onServerStarted = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (this._onWebSiteReady) {
                    this._onWebSiteReady.forEach(function (e) { return e(); });
                }
                if (isBrowserRefreshEnabled()) {
                    installBrowserRefreshSseEvent(this);
                }
                if (this.welcomeUrl) {
                    console.log("Website started:", this.welcomeUrl);
                }
                return [2 /*return*/];
            });
        });
    };
    WebSiteImpl.prototype.addGlobalMiddleware = function (method, middleware, options) {
        options = options || {};
        var m = method ? method : "*";
        if (!this.globalMiddlewares[m])
            this.globalMiddlewares[m] = [];
        this.globalMiddlewares[m].push({ priority: options.priority || PriorityLevel.default, value: middleware, regExp: options.regExp });
    };
    WebSiteImpl.prototype.addGlobalPostMiddleware = function (method, middleware, options) {
        options = options || {};
        var m = method ? method : "*";
        if (!this.globalPostMiddlewares[m])
            this.globalPostMiddlewares[m] = [];
        this.globalPostMiddlewares[m].push({ priority: options.priority || PriorityLevel.default, value: middleware, regExp: options.regExp });
    };
    WebSiteImpl.prototype.addSourceServer = function (serverFetch, weight) {
        this.loadBalancer.addServer(serverFetch, weight);
    };
    WebSiteImpl.prototype.enableCors = function (allows) {
        if (!allows)
            allows = [this.welcomeUrl];
        this.addGlobalPostMiddleware(undefined, PostMiddlewares.cors({ accessControlAllowOrigin: allows }), { priority: PriorityLevel.veryHigh });
    };
    WebSiteImpl.prototype.applyMiddlewares = function (verb, route, handler) {
        function merge(a, b) {
            if (!a)
                return b;
            if (!b)
                return a;
            return a.concat(b);
        }
        var webSite = this;
        var routeInfos = this.getRouteInfos(verb, route);
        var routeRawMiddlewares = routeInfos ? routeInfos.middlewares : undefined;
        var routeRawPostMiddlewares = routeInfos ? routeInfos.postMiddlewares : undefined;
        var globalRawMiddleware = this.globalMiddlewares[verb];
        var globalRawPostMiddleware = this.globalPostMiddlewares[verb];
        if (globalRawMiddleware) {
            globalRawMiddleware = globalRawMiddleware.filter(function (m) {
                if (m.regExp) {
                    return m.regExp.test(route);
                }
                return true;
            });
        }
        if (globalRawPostMiddleware) {
            globalRawPostMiddleware = globalRawPostMiddleware.filter(function (m) {
                if (m.regExp) {
                    return m.regExp.test(route);
                }
                return true;
            });
        }
        var middlewares = sortByPriority(merge(routeRawMiddlewares, globalRawMiddleware));
        var middlewares_count = middlewares ? middlewares.length : 0;
        var postMiddlewares = sortByPriority(merge(routeRawPostMiddlewares, globalRawPostMiddleware));
        var postMiddlewares_count = postMiddlewares ? postMiddlewares.length : 0;
        if (verb === "GET") {
            return function (req) {
                return __awaiter(this, void 0, void 0, function () {
                    var i, mRes, mustUseAutoCache, res, isFromCache, r, r, pRes, _a, i, mRes, _b, r;
                    return __generator(this, function (_c) {
                        switch (_c.label) {
                            case 0:
                                // >>> Check the required roles.
                                if (req.routeInfos.requiredRoles) {
                                    req.assertUserHasRoles(req.routeInfos.requiredRoles);
                                }
                                if (!middlewares) return [3 /*break*/, 5];
                                i = 0;
                                _c.label = 1;
                            case 1:
                                if (!(i < middlewares_count)) return [3 /*break*/, 5];
                                mRes = middlewares[i](req);
                                if (!mRes) return [3 /*break*/, 4];
                                if (!(mRes instanceof Promise)) return [3 /*break*/, 3];
                                return [4 /*yield*/, mRes];
                            case 2:
                                mRes = _c.sent();
                                _c.label = 3;
                            case 3:
                                if (mRes)
                                    return [2 /*return*/, mRes];
                                _c.label = 4;
                            case 4:
                                i++;
                                return [3 /*break*/, 1];
                            case 5:
                                mustUseAutoCache = req.mustUseAutoCache;
                                isFromCache = false;
                                if (!mustUseAutoCache) return [3 /*break*/, 10];
                                if (!req.routeInfos.beforeCheckingCache) return [3 /*break*/, 7];
                                return [4 /*yield*/, req.routeInfos.beforeCheckingCache(req)];
                            case 6:
                                r = _c.sent();
                                if (r)
                                    return [2 /*return*/, r];
                                _c.label = 7;
                            case 7: return [4 /*yield*/, req.getFromCache()];
                            case 8:
                                res = _c.sent();
                                if (!res) return [3 /*break*/, 10];
                                isFromCache = true;
                                if (!req.routeInfos.afterGetFromCache) return [3 /*break*/, 10];
                                return [4 /*yield*/, req.routeInfos.afterGetFromCache(req, res)];
                            case 9:
                                r = _c.sent();
                                if (r)
                                    res = r;
                                _c.label = 10;
                            case 10:
                                if (!!res) return [3 /*break*/, 14];
                                pRes = handler(req);
                                if (!(pRes instanceof Promise)) return [3 /*break*/, 12];
                                return [4 /*yield*/, pRes];
                            case 11:
                                _a = _c.sent();
                                return [3 /*break*/, 13];
                            case 12:
                                _a = pRes;
                                _c.label = 13;
                            case 13:
                                res = _a;
                                _c.label = 14;
                            case 14:
                                // >>> Add the authentification cookie.
                                if (req.getJwtToken()) {
                                    webSite.storeJwtToken(req, res);
                                }
                                if (!postMiddlewares) return [3 /*break*/, 20];
                                i = 0;
                                _c.label = 15;
                            case 15:
                                if (!(i < postMiddlewares_count)) return [3 /*break*/, 20];
                                mRes = postMiddlewares[i](req, res);
                                if (!(mRes instanceof Promise)) return [3 /*break*/, 17];
                                return [4 /*yield*/, mRes];
                            case 16:
                                _b = _c.sent();
                                return [3 /*break*/, 18];
                            case 17:
                                _b = mRes;
                                _c.label = 18;
                            case 18:
                                res = _b;
                                _c.label = 19;
                            case 19:
                                i++;
                                return [3 /*break*/, 15];
                            case 20:
                                if (!(!isFromCache && mustUseAutoCache && (res.status === 200))) return [3 /*break*/, 26];
                                if (!req.routeInfos.beforeAddToCache) return [3 /*break*/, 24];
                                return [4 /*yield*/, req.routeInfos.beforeAddToCache(req, res)];
                            case 21:
                                r = _c.sent();
                                if (!r) return [3 /*break*/, 23];
                                return [4 /*yield*/, req.addToCache(r)];
                            case 22:
                                res = _c.sent();
                                _c.label = 23;
                            case 23: return [3 /*break*/, 26];
                            case 24: return [4 /*yield*/, req.addToCache(res)];
                            case 25:
                                res = _c.sent();
                                _c.label = 26;
                            case 26: return [2 /*return*/, res];
                        }
                    });
                });
            };
        }
        else {
            return function (req) {
                return __awaiter(this, void 0, void 0, function () {
                    var i, res_1, pRes, res, _a, i, mRes, _b;
                    return __generator(this, function (_c) {
                        switch (_c.label) {
                            case 0:
                                // >>> Check the required roles.
                                if (req.routeInfos.requiredRoles) {
                                    req.assertUserHasRoles(req.routeInfos.requiredRoles);
                                }
                                if (!middlewares) return [3 /*break*/, 5];
                                i = 0;
                                _c.label = 1;
                            case 1:
                                if (!(i < middlewares_count)) return [3 /*break*/, 5];
                                res_1 = middlewares[i](req);
                                if (!res_1) return [3 /*break*/, 4];
                                if (!(res_1 instanceof Promise)) return [3 /*break*/, 3];
                                return [4 /*yield*/, res_1];
                            case 2:
                                res_1 = _c.sent();
                                _c.label = 3;
                            case 3:
                                if (res_1)
                                    return [2 /*return*/, res_1];
                                _c.label = 4;
                            case 4:
                                i++;
                                return [3 /*break*/, 1];
                            case 5:
                                pRes = handler(req);
                                if (!(pRes instanceof Promise)) return [3 /*break*/, 7];
                                return [4 /*yield*/, pRes];
                            case 6:
                                _a = _c.sent();
                                return [3 /*break*/, 8];
                            case 7:
                                _a = pRes;
                                _c.label = 8;
                            case 8:
                                res = _a;
                                // >>> Add the authentification cookie.
                                if (req.getJwtToken()) {
                                    webSite.storeJwtToken(req, res);
                                }
                                if (!postMiddlewares) return [3 /*break*/, 14];
                                i = 0;
                                _c.label = 9;
                            case 9:
                                if (!(i < postMiddlewares_count)) return [3 /*break*/, 14];
                                mRes = postMiddlewares[i](req, res);
                                if (!(mRes instanceof Promise)) return [3 /*break*/, 11];
                                return [4 /*yield*/, mRes];
                            case 10:
                                _b = _c.sent();
                                return [3 /*break*/, 12];
                            case 11:
                                _b = mRes;
                                _c.label = 12;
                            case 12:
                                res = _b;
                                _c.label = 13;
                            case 13:
                                i++;
                                return [3 /*break*/, 9];
                            case 14: return [2 /*return*/, res];
                        }
                    });
                });
            };
        }
    };
    WebSiteImpl.prototype.getOrCreateHttpRedirectWebsite = function () {
        var _this = this;
        if (this.http80WebSite)
            return this.http80WebSite;
        if (this.port === 80)
            return this;
        var urlInfos = new URL(this.welcomeUrl);
        urlInfos.port = "";
        urlInfos.protocol = "http";
        var webSite = new WebSiteImpl(urlInfos.href);
        this.http80WebSite = webSite;
        webSite.onGET("/**", function (req) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                req.urlInfos.port = "";
                req.urlInfos.protocol = "https";
                return [2 /*return*/, req.redirectResponse(true, req.urlInfos.href)];
            });
        }); });
        return webSite;
    };
    WebSiteImpl.prototype.updateSslCertificate = function (certificate) {
        this.certificate = certificate;
        if (this._onRebuildCertificate)
            this._onRebuildCertificate();
    };
    /*declareNewWebSocketConnection(jws: JopiWebSocket, infos: WebSocketConnectionInfos, urlInfos: URL) {
        const matched = findRoute(this.wsRouter, "ws", urlInfos.pathname);

        if (!matched) {
            jws.close();
            return;
        }

        try { matched.data(jws, infos); }
        catch(e) { console.error(e) }
    }*/
    WebSiteImpl.prototype.onWebSocketConnect = function (path, handler) {
        return this.serverInstanceBuilder.addWsRoute(path, handler);
    };
    WebSiteImpl.prototype.addSseEVent = function (path, handler) {
        this.serverInstanceBuilder.addSseEVent(path, handler);
    };
    //region UI Modules
    WebSiteImpl.prototype.executeBrowserInstall = function (pageController) {
        executeBrowserInstall(this.createModuleInitInstance(pageController));
    };
    /**
     * Allow overriding the instance used by modules 'uiInit.tsx' files.
     * @param instancier
     */
    WebSiteImpl.prototype.setModuleInitClassInstancier = function (instancier) {
        this.createModuleInitInstance = instancier;
    };
    WebSiteImpl.prototype.createModuleInitInstance = function (pageController) {
        // Note: this function will be replaced.
        return new ModuleInitContext(pageController);
    };
    WebSiteImpl.prototype.getCache = function () {
        return this.mainCache;
    };
    WebSiteImpl.prototype.setCache = function (pageCache) {
        this.mainCache = pageCache || gVoidCache;
    };
    WebSiteImpl.prototype.disableAutomaticCache = function () {
        this.mustUseAutomaticCache = false;
    };
    WebSiteImpl.prototype.getHeadersToCache = function () {
        return this.headersToCache;
    };
    WebSiteImpl.prototype.addHeaderToCache = function (header) {
        header = header.trim().toLowerCase();
        if (!this.headersToCache.includes(header))
            this.headersToCache.push(header);
    };
    WebSiteImpl.prototype.setCacheRules = function (rules) {
        this.cacheRules = rules;
    };
    WebSiteImpl.prototype.applyCacheRules = function (routeInfos, path) {
        for (var _i = 0, _a = this.cacheRules; _i < _a.length; _i++) {
            var rule = _a[_i];
            if (rule.regExp) {
                if (!rule.regExp.test(path))
                    continue;
            }
            if (!routeInfos.afterGetFromCache) {
                routeInfos.afterGetFromCache = rule.afterGetFromCache;
            }
            if (!routeInfos.beforeAddToCache) {
                routeInfos.beforeAddToCache = rule.beforeAddToCache;
            }
            if (!routeInfos.beforeCheckingCache) {
                routeInfos.beforeCheckingCache = rule.beforeCheckingCache;
            }
        }
    };
    WebSiteImpl.prototype.storeJwtToken = function (req, res) {
        var token = req.getJwtToken();
        if (this.jwtTokenStore) {
            this.jwtTokenStore(req.getJwtToken(), "jwt " + token, req, res);
        }
        else {
            // Note: here we don't set the "Authorization" header, since it's an input-only header.
            req.addCookie(res, "authorization", "jwt " + token, { maxAge: ONE_DAY * 7 });
        }
    };
    WebSiteImpl.prototype.setJwtTokenStore = function (store) {
        this.jwtTokenStore = store;
    };
    WebSiteImpl.prototype.createJwtToken = function (data) {
        try {
            return jwt.sign(data, this.JWT_SECRET, this.jwtSignInOptions);
        }
        catch (e) {
            console.error("createJwtToken", e);
            return undefined;
        }
    };
    WebSiteImpl.prototype.decodeJwtToken = function (token) {
        if (!this.JWT_SECRET)
            return undefined;
        try {
            return jwt.verify(token, this.JWT_SECRET);
        }
        catch (_a) {
            return undefined;
        }
    };
    WebSiteImpl.prototype.setJwtSecret = function (secret) {
        this.JWT_SECRET = secret;
    };
    WebSiteImpl.prototype.tryAuthUser = function (loginInfo) {
        return __awaiter(this, void 0, void 0, function () {
            var res;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.authHandler) return [3 /*break*/, 3];
                        res = this.authHandler(loginInfo);
                        if (!(res instanceof Promise)) return [3 /*break*/, 2];
                        return [4 /*yield*/, res];
                    case 1: return [2 /*return*/, _a.sent()];
                    case 2: return [2 /*return*/, res];
                    case 3: return [2 /*return*/, { isOk: false }];
                }
            });
        });
    };
    WebSiteImpl.prototype.setAuthHandler = function (authHandler) {
        this.authHandler = authHandler;
    };
    WebSiteImpl.prototype.saveRouteInfos = function (verb, route, routeInfos) {
        this.allRouteInfos[verb + " " + route] = routeInfos;
    };
    WebSiteImpl.prototype.getRouteInfos = function (verb, route) {
        return this.allRouteInfos[verb + " " + route];
    };
    //region Path handler
    WebSiteImpl.prototype.onVerb = function (verb, path, handler) {
        handler = this.applyMiddlewares(verb, path, handler);
        var routeInfos = { handler: handler };
        this.saveRouteInfos(verb, path, routeInfos);
        this.serverInstanceBuilder.addRoute(verb, path, routeInfos);
        if (verb === "GET")
            this.applyCacheRules(routeInfos, path);
        return routeInfos;
    };
    WebSiteImpl.prototype.onPage = function (path, pageKey, reactComponent) {
        var routeInfos = { handler: gVoidRouteHandler };
        this.saveRouteInfos("GET", path, routeInfos);
        this.serverInstanceBuilder.addPage(path, pageKey, reactComponent, routeInfos);
        // Cache is automatically enabled for pages.
        routeInfos.mustEnableAutomaticCache = true;
        return routeInfos;
    };
    WebSiteImpl.prototype.onGET = function (path, handler) {
        return this.onVerb("GET", path, handler);
    };
    WebSiteImpl.prototype.onPOST = function (path, handler) {
        return this.onVerb("POST", path, handler);
    };
    WebSiteImpl.prototype.onPUT = function (path, handler) {
        return this.onVerb("PUT", path, handler);
    };
    WebSiteImpl.prototype.onDELETE = function (path, handler) {
        return this.onVerb("DELETE", path, handler);
    };
    WebSiteImpl.prototype.onPATCH = function (path, handler) {
        return this.onVerb("PATCH", path, handler);
    };
    WebSiteImpl.prototype.onHEAD = function (path, handler) {
        return this.onVerb("HEAD", path, handler);
    };
    WebSiteImpl.prototype.onOPTIONS = function (path, handler) {
        return this.onVerb("OPTIONS", path, handler);
    };
    //endregion
    //region Error handler
    WebSiteImpl.prototype.on404_NotFound = function (handler) {
        this._on404_NotFound = handler;
    };
    WebSiteImpl.prototype.on500_Error = function (handler) {
        this._on500_Error = handler;
    };
    WebSiteImpl.prototype.on401_Unauthorized = function (handler) {
        this._on401_Unauthorized = handler;
    };
    WebSiteImpl.prototype.return404 = function (req) {
        return __awaiter(this, void 0, void 0, function () {
            var accept, res;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        accept = req.headers.get("accept");
                        if (!accept || !accept.startsWith("text/html"))
                            return [2 /*return*/, new Response("", { status: 404 })];
                        if (!this._on404_NotFound) return [3 /*break*/, 4];
                        return [4 /*yield*/, this._on404_NotFound(req)];
                    case 1:
                        res = _a.sent();
                        if (!(res instanceof Promise)) return [3 /*break*/, 3];
                        return [4 /*yield*/, res];
                    case 2:
                        res = _a.sent();
                        _a.label = 3;
                    case 3:
                        if (res) {
                            if (res.status !== 404) {
                                return [2 /*return*/, new Response(res.body, { status: 404, headers: res.headers })];
                            }
                            return [2 /*return*/, res];
                        }
                        _a.label = 4;
                    case 4: return [2 /*return*/, new Response("", { status: 404 })];
                }
            });
        });
    };
    WebSiteImpl.prototype.return500 = function (req, error) {
        return __awaiter(this, void 0, void 0, function () {
            var accept, res;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        accept = req.headers.get("accept");
                        if (!accept || !accept.startsWith("text/html"))
                            return [2 /*return*/, new Response("", { status: 500 })];
                        if (!this._on500_Error) return [3 /*break*/, 3];
                        // Avoid recursions.
                        req.returnError500_ServerError = function () { return __awaiter(_this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                return [2 /*return*/, new Response("Internal server error", { status: 500 })];
                            });
                        }); };
                        res = this._on500_Error(req, error);
                        if (!(res instanceof Promise)) return [3 /*break*/, 2];
                        return [4 /*yield*/, res];
                    case 1:
                        res = _a.sent();
                        _a.label = 2;
                    case 2:
                        if (res) {
                            if (res.status !== 500) {
                                return [2 /*return*/, new Response(res.body, { status: 500, headers: res.headers })];
                            }
                            return [2 /*return*/, res];
                        }
                        _a.label = 3;
                    case 3: return [2 /*return*/, new Response("", { status: 500 })];
                }
            });
        });
    };
    WebSiteImpl.prototype.return401 = function (req, error) {
        return __awaiter(this, void 0, void 0, function () {
            var res;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this._on401_Unauthorized) return [3 /*break*/, 3];
                        res = this._on401_Unauthorized(req, error);
                        if (!(res instanceof Promise)) return [3 /*break*/, 2];
                        return [4 /*yield*/, res];
                    case 1:
                        res = _a.sent();
                        _a.label = 2;
                    case 2:
                        if (res) {
                            if (res.status !== 401) {
                                return [2 /*return*/, new Response(res.body, { status: 401, headers: res.headers })];
                            }
                            return [2 /*return*/, res];
                        }
                        _a.label = 3;
                    case 3:
                        if (req.method !== "GET") {
                            return [2 /*return*/, new Response(error ? error.toString() : "", { status: 401 })];
                        }
                        return [2 /*return*/, new Response("", { status: 401 })];
                }
            });
        });
    };
    return WebSiteImpl;
}());
export { WebSiteImpl };
var gVoidRouteHandler = function () { return Promise.resolve(new Response("void", { status: 200 })); };
var WebSiteOptions = /** @class */ (function () {
    function WebSiteOptions() {
    }
    return WebSiteOptions;
}());
export { WebSiteOptions };
var JopiWebSocket = /** @class */ (function () {
    function JopiWebSocket(webSite, server, webSocket) {
        this.webSite = webSite;
        this.server = server;
        this.webSocket = webSocket;
    }
    JopiWebSocket.prototype.close = function () {
        this.webSocket.close();
    };
    JopiWebSocket.prototype.onMessage = function (listener) {
        jk_webSocket.onMessage(this.webSocket, listener);
    };
    JopiWebSocket.prototype.sendMessage = function (msg) {
        jk_webSocket.sendMessage(this.webSocket, msg);
    };
    return JopiWebSocket;
}());
export { JopiWebSocket };
export function newWebSite(url, options) {
    return new WebSiteImpl(url, options);
}
var SBPE_ServerByPassException = /** @class */ (function (_super) {
    __extends(SBPE_ServerByPassException, _super);
    function SBPE_ServerByPassException() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return SBPE_ServerByPassException;
}(Error));
export { SBPE_ServerByPassException };
var SBPE_NotAuthorizedException = /** @class */ (function (_super) {
    __extends(SBPE_NotAuthorizedException, _super);
    function SBPE_NotAuthorizedException() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return SBPE_NotAuthorizedException;
}(SBPE_ServerByPassException));
export { SBPE_NotAuthorizedException };
var SBPE_DirectSendThisResponseException = /** @class */ (function (_super) {
    __extends(SBPE_DirectSendThisResponseException, _super);
    function SBPE_DirectSendThisResponseException(response) {
        var _this = _super.call(this) || this;
        _this.response = response;
        return _this;
    }
    return SBPE_DirectSendThisResponseException;
}(SBPE_ServerByPassException));
export { SBPE_DirectSendThisResponseException };
var SBPE_MustReturnWithoutResponseException = /** @class */ (function (_super) {
    __extends(SBPE_MustReturnWithoutResponseException, _super);
    function SBPE_MustReturnWithoutResponseException() {
        return _super.call(this) || this;
    }
    return SBPE_MustReturnWithoutResponseException;
}(SBPE_ServerByPassException));
export { SBPE_MustReturnWithoutResponseException };
var ServerAlreadyStartedError = /** @class */ (function (_super) {
    __extends(ServerAlreadyStartedError, _super);
    function ServerAlreadyStartedError() {
        return _super.call(this, "the server is already") || this;
    }
    return ServerAlreadyStartedError;
}(Error));
export { ServerAlreadyStartedError };
var gVoidCache = new VoidPageCache();
