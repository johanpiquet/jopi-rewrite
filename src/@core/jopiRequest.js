// noinspection JSUnusedGlobalSymbols
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
import React from "react";
import { PageController_ExposePrivate } from "jopi-rewrite/ui";
import * as ReactServer from "react-dom/server";
import * as cheerio from "cheerio";
import * as jk_schema from "jopi-toolkit/jk_schema";
import Page from "./PageComponent.tsx";
import { initCheerio } from "./jQuery.ts";
import { WebSiteMirrorCache } from "./caches/cache.ts";
import { SBPE_DirectSendThisResponseException, SBPE_NotAuthorizedException } from "./jopiWebSite.tsx";
import { parseCookies } from "./internalTools.ts";
import * as jk_term from "jopi-toolkit/jk_term";
import * as jk_fs from "jopi-toolkit/jk_fs";
var JopiRequest = /** @class */ (function () {
    function JopiRequest(webSite, _urlInfos, coreRequest, coreServer, routeInfos) {
        this.webSite = webSite;
        this._urlInfos = _urlInfos;
        this.coreRequest = coreRequest;
        this.coreServer = coreServer;
        this.routeInfos = routeInfos;
        //endregion
        //region Cache
        this._isAddedToCache = false;
        this.hasNoUserInfos = false;
        this.cache = webSite.mainCache;
        this.mustUseAutoCache = webSite.mustUseAutomaticCache && routeInfos && (routeInfos.mustEnableAutomaticCache === true);
        this.mainCache = this.cache;
        this._headers = this.coreRequest.headers;
    }
    Object.defineProperty(JopiRequest.prototype, "urlInfos", {
        get: function () {
            if (!this._urlInfos) {
                this._urlInfos = new URL(this.coreRequest.url);
                this._urlInfos.hash = "";
            }
            return this._urlInfos;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(JopiRequest.prototype, "customData", {
        get: function () {
            if (!this._customData)
                this._customData = {};
            return this._customData;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(JopiRequest.prototype, "method", {
        /**
         * Return the verb used for the request (GET, POST, PUT, DELETE, ...)
         */
        get: function () {
            return this.coreRequest.method;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(JopiRequest.prototype, "reqContentType", {
        /**
         * Return the content type of the request.
         */
        get: function () {
            return this.coreRequest.headers.get("content-type");
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(JopiRequest.prototype, "url", {
        get: function () {
            return this.coreRequest.url;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(JopiRequest.prototype, "body", {
        get: function () {
            return this.coreRequest.body;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(JopiRequest.prototype, "headers", {
        get: function () {
            return this._headers;
        },
        set: function (value) {
            this._headers = value;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(JopiRequest.prototype, "urlSearchParams", {
        /**
         * Returns the url search params.
         * For "https://my-site/?sort=asc&filter=jopi", it returns {sort: "asc", filter: "jopi"}.
         */
        get: function () {
            var sp = this.urlInfos.searchParams;
            if (!sp.size)
                return {};
            var res = {};
            sp.forEach(function (value, key) { return res[key] = value; });
            return res;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(JopiRequest.prototype, "requestIP", {
        /**
         * Returns information on the caller IP.
         */
        get: function () {
            return this.coreServer.requestIP(this.coreRequest);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(JopiRequest.prototype, "isFromLocalhost", {
        get: function () {
            var ip = this.requestIP;
            if (!ip)
                return false;
            var address = ip.address;
            switch (address) {
                case "::1":
                case "127.0.0.1":
                case "::ffff:127.0.0.1":
                    return true;
            }
            return false;
        },
        enumerable: false,
        configurable: true
    });
    //endregion
    //region Body transforming
    /**
     * Returns all the data about the request.
     * It's concat all data source.
     *
     * - The url parts.
     * - The search param (query string).
     * - The POST/PUT data if available.
     */
    JopiRequest.prototype.getReqData = function (options) {
        return __awaiter(this, void 0, void 0, function () {
            var res, searchParams, asJson, _a, data, _b, asFormData, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        res = {};
                        if (!(options && options.ignoreUrl)) {
                            searchParams = this.urlInfos.searchParams;
                            if (searchParams.size) {
                                searchParams.forEach(function (value, key) { return res[key] = value; });
                            }
                            if (this.urlParts) {
                                res = __assign(__assign({}, res), this.urlParts);
                            }
                        }
                        if (!this.isReqBodyJson) return [3 /*break*/, 5];
                        _d.label = 1;
                    case 1:
                        _d.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.reqBodyAsJson()];
                    case 2:
                        asJson = _d.sent();
                        if (asJson)
                            res = __assign(__assign({}, res), asJson);
                        return [3 /*break*/, 4];
                    case 3:
                        _a = _d.sent();
                        return [3 /*break*/, 4];
                    case 4: return [3 /*break*/, 14];
                    case 5:
                        if (!this.isReqBodyXFormUrlEncoded) return [3 /*break*/, 10];
                        _d.label = 6;
                    case 6:
                        _d.trys.push([6, 8, , 9]);
                        return [4 /*yield*/, this.reqBodyAsText()];
                    case 7:
                        data = _d.sent();
                        new URLSearchParams(data).forEach(function (value, key) { return res[key] = value; });
                        return [3 /*break*/, 9];
                    case 8:
                        _b = _d.sent();
                        return [3 /*break*/, 9];
                    case 9: return [3 /*break*/, 14];
                    case 10:
                        if (!this.isReqBodyFormData) return [3 /*break*/, 14];
                        _d.label = 11;
                    case 11:
                        _d.trys.push([11, 13, , 14]);
                        return [4 /*yield*/, this.reqBodyAsFormData()];
                    case 12:
                        asFormData = _d.sent();
                        asFormData.forEach(function (value, key) { return res[key] = value; });
                        return [3 /*break*/, 14];
                    case 13:
                        _c = _d.sent();
                        return [3 /*break*/, 14];
                    case 14:
                        if (options && options.dataSchema) {
                            this.validateDataSchema(res, options.dataSchema);
                        }
                        return [2 /*return*/, res];
                }
            });
        });
    };
    /**
     * Get the request body and decode it properly.
     */
    JopiRequest.prototype.getBodyData = function (options) {
        return __awaiter(this, void 0, void 0, function () {
            var res, asJson, _a, data, _b, asFormData, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        res = {};
                        if (!this.isReqBodyJson) return [3 /*break*/, 5];
                        _d.label = 1;
                    case 1:
                        _d.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.reqBodyAsJson()];
                    case 2:
                        asJson = _d.sent();
                        if (asJson)
                            res = __assign(__assign({}, res), asJson);
                        return [3 /*break*/, 4];
                    case 3:
                        _a = _d.sent();
                        return [3 /*break*/, 4];
                    case 4: return [3 /*break*/, 14];
                    case 5:
                        if (!this.isReqBodyXFormUrlEncoded) return [3 /*break*/, 10];
                        _d.label = 6;
                    case 6:
                        _d.trys.push([6, 8, , 9]);
                        return [4 /*yield*/, this.reqBodyAsText()];
                    case 7:
                        data = _d.sent();
                        new URLSearchParams(data).forEach(function (value, key) { return res[key] = value; });
                        return [3 /*break*/, 9];
                    case 8:
                        _b = _d.sent();
                        return [3 /*break*/, 9];
                    case 9: return [3 /*break*/, 14];
                    case 10:
                        if (!this.isReqBodyFormData) return [3 /*break*/, 14];
                        _d.label = 11;
                    case 11:
                        _d.trys.push([11, 13, , 14]);
                        return [4 /*yield*/, this.reqBodyAsFormData()];
                    case 12:
                        asFormData = _d.sent();
                        asFormData.forEach(function (value, key) { return res[key] = value; });
                        return [3 /*break*/, 14];
                    case 13:
                        _c = _d.sent();
                        return [3 /*break*/, 14];
                    case 14:
                        if (options && options.dataSchema) {
                            this.validateDataSchema(res, options.dataSchema);
                        }
                        return [2 /*return*/, res];
                }
            });
        });
    };
    /**
     * Returns all the data about the request, organized by category.
     */
    JopiRequest.prototype.getReqDataInfos = function () {
        return __awaiter(this, void 0, void 0, function () {
            var res, searchParams, t_1, _a, _b, t_2, asFormData, _c, data, t_3, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        res = {};
                        searchParams = this.urlInfos.searchParams;
                        if (searchParams.size) {
                            t_1 = res.searchParams = {};
                            searchParams.forEach(function (value, key) { return t_1[key] = value; });
                        }
                        if (this.urlParts) {
                            res.urlParts = __assign({}, this.urlParts);
                        }
                        if (!this.isReqBodyJson) return [3 /*break*/, 5];
                        _e.label = 1;
                    case 1:
                        _e.trys.push([1, 3, , 4]);
                        _a = res;
                        return [4 /*yield*/, this.reqBodyAsJson()];
                    case 2:
                        _a.body = _e.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        _b = _e.sent();
                        return [3 /*break*/, 4];
                    case 4: return [3 /*break*/, 14];
                    case 5:
                        if (!this.isReqBodyFormData) return [3 /*break*/, 10];
                        _e.label = 6;
                    case 6:
                        _e.trys.push([6, 8, , 9]);
                        t_2 = res.formData = {};
                        return [4 /*yield*/, this.reqBodyAsFormData()];
                    case 7:
                        asFormData = _e.sent();
                        asFormData.forEach(function (value, key) { return t_2[key] = value; });
                        return [3 /*break*/, 9];
                    case 8:
                        _c = _e.sent();
                        return [3 /*break*/, 9];
                    case 9: return [3 /*break*/, 14];
                    case 10:
                        if (!this.isReqBodyXFormUrlEncoded) return [3 /*break*/, 14];
                        _e.label = 11;
                    case 11:
                        _e.trys.push([11, 13, , 14]);
                        return [4 /*yield*/, this.reqBodyAsText()];
                    case 12:
                        data = _e.sent();
                        t_3 = res.formUrlEncoded = {};
                        new URLSearchParams(data).forEach(function (value, key) { return t_3[key] = value; });
                        return [3 /*break*/, 14];
                    case 13:
                        _d = _e.sent();
                        return [3 /*break*/, 14];
                    case 14: return [2 /*return*/, res];
                }
            });
        });
    };
    Object.defineProperty(JopiRequest.prototype, "isReqBodyUsed", {
        /**
         * https://developer.mozilla.org/en-US/docs/Web/API/Request/bodyUsed
         */
        get: function () {
            return this.coreRequest.bodyUsed;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(JopiRequest.prototype, "isReqBodyJson", {
        get: function () {
            var ct = this.reqContentType;
            if (ct === null)
                return false;
            return ct.startsWith("application/json");
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(JopiRequest.prototype, "isReqBodyFormData", {
        get: function () {
            var ct = this.reqContentType;
            if (ct === null)
                return false;
            return ct.startsWith("multipart/form-data");
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(JopiRequest.prototype, "isReqBodyXFormUrlEncoded", {
        get: function () {
            var ct = this.reqContentType;
            if (ct === null)
                return false;
            return ct.startsWith("application/x-www-form-urlencoded");
        },
        enumerable: false,
        configurable: true
    });
    JopiRequest.prototype.reqBodyAsText = function () {
        return this.coreRequest.text();
    };
    /**
     * Validate the data Schema.
     * If invalid, throw a special exception allowing
     * to directly send a response to the caller.
     */
    JopiRequest.prototype.validateDataSchema = function (data, schema) {
        var _this = this;
        var error = jk_schema.validateSchema(data, schema);
        if (error) {
            throw new SBPE_DirectSendThisResponseException(function () {
                return _this.returnError400_BadRequest("Invalid data");
            });
        }
    };
    JopiRequest.prototype.reqBodyAsJson = function (dataSchema) {
        return __awaiter(this, void 0, void 0, function () {
            var data;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!dataSchema) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.reqBodyAsJson()];
                    case 1:
                        data = _a.sent();
                        this.validateDataSchema(data, dataSchema);
                        return [2 /*return*/, data];
                    case 2: return [4 /*yield*/, this.coreRequest.json()];
                    case 3: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    /**
     * https://developer.mozilla.org/en-US/docs/Web/API/Request/arrayBuffer
     */
    JopiRequest.prototype.reqBodyAsArrayBuffer = function () {
        return this.coreRequest.arrayBuffer();
    };
    /**
     * https://developer.mozilla.org/en-US/docs/Web/API/Request/blob
     */
    JopiRequest.prototype.reqBodyAsBlob = function () {
        return this.coreRequest.blob();
    };
    /**
     * https://developer.mozilla.org/en-US/docs/Web/API/Request/bytes
     */
    JopiRequest.prototype.reqBodyAsBytes = function () {
        return this.coreRequest.bytes();
    };
    /**
     * https://developer.mozilla.org/en-US/docs/Web/API/Request/formData
     */
    JopiRequest.prototype.reqBodyAsFormData = function () {
        return this.coreRequest.formData();
    };
    //endregion
    //region Request timeout
    /**
     * When DDOS protection is enabled, the request has a timeout of 60 seconds.
     * Here it'd allow you to extend this time for a request you knew was slow.
     */
    JopiRequest.prototype.extendTimeout_sec = function (sec) {
        this.coreServer.timeout(this.coreRequest, sec);
    };
    //endregion
    //region Response helpers
    JopiRequest.prototype.redirectResponse = function (permanent, url) {
        if (permanent === void 0) { permanent = false; }
        if (!url)
            url = this.urlInfos;
        return new Response(null, { status: permanent ? 301 : 302, headers: { "location": url.toString() } });
    };
    JopiRequest.prototype.textResponse = function (text, statusCode) {
        if (statusCode === void 0) { statusCode = 200; }
        return new Response(text, { status: statusCode, headers: { "content-type": "text/plain;charset=utf-8" } });
    };
    JopiRequest.prototype.returnResultMessage = function (isOk, message) {
        return this.jsonResponse({ isOk: isOk, message: message });
    };
    JopiRequest.prototype.htmlResponse = function (html, statusCode) {
        if (statusCode === void 0) { statusCode = 200; }
        return new Response(html, { status: statusCode, headers: { "content-type": "text/html;charset=utf-8" } });
    };
    JopiRequest.prototype.jsonResponse = function (json, statusCode) {
        if (statusCode === void 0) { statusCode = 200; }
        return new Response(JSON.stringify(json), {
            status: statusCode,
            headers: { "content-type": "application/json;charset=utf-8" }
        });
    };
    JopiRequest.prototype.jsonStringResponse = function (json, statusCode) {
        if (statusCode === void 0) { statusCode = 200; }
        return new Response(json, { status: statusCode, headers: { "content-type": "application/json;charset=utf-8" } });
    };
    JopiRequest.prototype.returnError404_NotFound = function () {
        return this.webSite.return404(this);
    };
    JopiRequest.prototype.returnError500_ServerError = function (error) {
        return this.webSite.return500(this, error);
    };
    JopiRequest.prototype.returnError401_Unauthorized = function (error) {
        return this.webSite.return401(this, error);
    };
    JopiRequest.prototype.returnError400_BadRequest = function (error) {
        return Promise.resolve(new Response(error ? error.toString() : "Bad request", { status: 400 }));
    };
    //endregion
    //region Fetch / Proxy
    JopiRequest.prototype.directProxyToServer = function () {
        return this.webSite.loadBalancer.directProxy(this);
    };
    JopiRequest.prototype.proxyRequestTo = function (server) {
        return server.directProxy(this);
    };
    JopiRequest.prototype.directProxyWith = function (server) {
        return server.directProxy(this);
    };
    JopiRequest.prototype.fetchServer = function (headers, method, url, body) {
        if (method === void 0) { method = "GET"; }
        if (!url)
            url = this.urlInfos;
        return this.webSite.loadBalancer.fetch(method, url, body, headers);
    };
    /**
     * Get from the cache the entry corresponding to the current url.
     *
     * @param useGzippedVersion
     *      If true, returns the compressed version in priority.
     *      If it doesn't exist, then will return the uncompressed version.
     */
    JopiRequest.prototype.getFromCache = function () {
        return __awaiter(this, arguments, void 0, function (useGzippedVersion) {
            if (useGzippedVersion === void 0) { useGzippedVersion = true; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.cache.getFromCache(this.urlInfos, useGzippedVersion)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    JopiRequest.prototype.hasInCache = function (useGzippedVersion) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.cache.hasInCache(this.urlInfos, useGzippedVersion)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    JopiRequest.prototype.removeFromCache = function (url) {
        // Avoid double.
        //
        if (!url) {
            url = this.urlInfos;
            url.hostname = url.hostname.toLowerCase();
            url.pathname = url.pathname.toLowerCase();
        }
        return this.cache.removeFromCache(url || this.urlInfos);
    };
    JopiRequest.prototype.addToCache = function (response) {
        // Avoid adding two times in the same request.
        // This is required with automatic add functionnality.
        //
        if (this._isAddedToCache)
            return;
        this._isAddedToCache = false;
        return this.addToCache_Compressed(response);
    };
    JopiRequest.prototype.addToCache_Compressed = function (response) {
        return this.cache.addToCache(this.urlInfos, response, this.webSite.getHeadersToCache(), false);
    };
    JopiRequest.prototype.addToCache_Uncompressed = function (response) {
        return this.cache.addToCache(this.urlInfos, response, this.webSite.getHeadersToCache(), true);
    };
    /**
     * Allow using a sub-cache.
     * For example, a cache dedicated per user.
     */
    JopiRequest.prototype.useCache = function (cache) {
        this.cache = cache;
    };
    JopiRequest.prototype.getSubCache = function (name) {
        return this.cache.createSubCache(name);
    };
    JopiRequest.prototype.getCacheEntryIterator = function () {
        return this.cache.getCacheEntryIterator();
    };
    //endregion
    //region Test type / React on type
    JopiRequest.prototype.getContentTypeCategory = function (response) {
        var contentType = response.headers.get("content-type");
        if (!contentType)
            return ContentTypeCategory.OTHER;
        if (contentType.startsWith("text/")) {
            if (contentType.startsWith("html", 5)) {
                return ContentTypeCategory.TEXT_HTML;
            }
            else if (contentType.startsWith("css")) {
                return ContentTypeCategory.TEXT_CSS;
            }
            else if (contentType.startsWith("javascript", 5)) {
                return ContentTypeCategory.TEXT_JAVASCRIPT;
            }
            else if (contentType.startsWith("json")) {
                return ContentTypeCategory.TEXT_JSON;
            }
        }
        else if (contentType.startsWith("image")) {
            return ContentTypeCategory.IMAGE;
        }
        else if (contentType.startsWith("application")) {
            if (contentType.startsWith("x-www-form-urlencoded", 12)) {
                return ContentTypeCategory.FORM_URL_ENCODED;
            }
            else if (contentType.startsWith("json", 12)) {
                return ContentTypeCategory.TEXT_JSON;
            }
            else if (contentType.startsWith("javascript", 12)) {
                return ContentTypeCategory.TEXT_JAVASCRIPT;
            }
        }
        else if (contentType.startsWith("multipart/form-data")) {
            return ContentTypeCategory.FORM_MULTIPART;
        }
        return ContentTypeCategory.OTHER;
    };
    JopiRequest.prototype.isHtml = function (response) {
        var contentType = response.headers.get("content-type");
        if (contentType === null)
            return false;
        return contentType.startsWith("text/html");
    };
    JopiRequest.prototype.isCss = function (response) {
        var contentType = response.headers.get("content-type");
        if (contentType === null)
            return false;
        return contentType.startsWith("text/css");
    };
    JopiRequest.prototype.isJavascript = function (response) {
        var contentType = response.headers.get("content-type");
        if (contentType === null)
            return false;
        return contentType.startsWith("application/javascript") || contentType.startsWith("text/javascript");
    };
    JopiRequest.prototype.isJson = function (response) {
        var contentType = response.headers.get("content-type");
        if (contentType === null)
            return false;
        return contentType.startsWith("application/json");
    };
    JopiRequest.prototype.isXFormUrlEncoded = function (response) {
        var contentType = response.headers.get("content-type");
        if (contentType === null)
            return false;
        return contentType.startsWith("x-www-form-urlencoded");
    };
    JopiRequest.prototype.hookIfHtml = function (res) {
        var hooks = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            hooks[_i - 1] = arguments[_i];
        }
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!this.isHtml(res)) return [3 /*break*/, 2];
                        _a = Response.bind;
                        return [4 /*yield*/, this.applyTextModifiers(res, hooks)];
                    case 1: return [2 /*return*/, new (_a.apply(Response, [void 0, _b.sent(), { status: res.status, headers: res.headers }]))()];
                    case 2: return [2 /*return*/, Promise.resolve(res)];
                }
            });
        });
    };
    JopiRequest.prototype.hookIfCss = function (res) {
        var hooks = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            hooks[_i - 1] = arguments[_i];
        }
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!this.isCss(res)) return [3 /*break*/, 2];
                        _a = Response.bind;
                        return [4 /*yield*/, this.applyTextModifiers(res, hooks)];
                    case 1: return [2 /*return*/, new (_a.apply(Response, [void 0, _b.sent(), { status: res.status, headers: res.headers }]))()];
                    case 2: return [2 /*return*/, Promise.resolve(res)];
                }
            });
        });
    };
    JopiRequest.prototype.hookIfJavascript = function (res) {
        var hooks = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            hooks[_i - 1] = arguments[_i];
        }
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!this.isJavascript(res)) return [3 /*break*/, 2];
                        _a = Response.bind;
                        return [4 /*yield*/, this.applyTextModifiers(res, hooks)];
                    case 1: return [2 /*return*/, new (_a.apply(Response, [void 0, _b.sent(), { status: res.status, headers: res.headers }]))()];
                    case 2: return [2 /*return*/, Promise.resolve(res)];
                }
            });
        });
    };
    JopiRequest.prototype.applyTextModifiers = function (res, hooks) {
        return __awaiter(this, void 0, void 0, function () {
            var text, _i, hooks_1, hook, hRes, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, res.text()];
                    case 1:
                        text = _b.sent();
                        _i = 0, hooks_1 = hooks;
                        _b.label = 2;
                    case 2:
                        if (!(_i < hooks_1.length)) return [3 /*break*/, 7];
                        hook = hooks_1[_i];
                        hRes = hook(text, this);
                        if (!(hRes instanceof Promise)) return [3 /*break*/, 4];
                        return [4 /*yield*/, hRes];
                    case 3:
                        _a = _b.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        _a = hRes;
                        _b.label = 5;
                    case 5:
                        text = _a;
                        _b.label = 6;
                    case 6:
                        _i++;
                        return [3 /*break*/, 2];
                    case 7: return [2 /*return*/, text];
                }
            });
        });
    };
    JopiRequest.prototype.executeModifiers = function (res, hooks) {
        return __awaiter(this, void 0, void 0, function () {
            var _i, hooks_2, hook, hRes, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _i = 0, hooks_2 = hooks;
                        _b.label = 1;
                    case 1:
                        if (!(_i < hooks_2.length)) return [3 /*break*/, 6];
                        hook = hooks_2[_i];
                        hRes = hook(res, this);
                        if (!(hRes instanceof Promise)) return [3 /*break*/, 3];
                        return [4 /*yield*/, hRes];
                    case 2:
                        _a = _b.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        _a = hRes;
                        _b.label = 4;
                    case 4:
                        res = _a;
                        _b.label = 5;
                    case 5:
                        _i++;
                        return [3 /*break*/, 1];
                    case 6: return [2 /*return*/, res];
                }
            });
        });
    };
    //endregion
    //region Spy
    JopiRequest.prototype.duplicateReadableStream = function (stream) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (!stream)
                    return [2 /*return*/, [null, null]];
                return [2 /*return*/, stream.tee()];
            });
        });
    };
    JopiRequest.prototype.duplicateRawRequest = function (raw) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, str1, str2, res1, res2;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.duplicateReadableStream(raw.body)];
                    case 1:
                        _a = _b.sent(), str1 = _a[0], str2 = _a[1];
                        res1 = new Request(raw.url, {
                            body: str1,
                            headers: raw.headers,
                            method: raw.method
                        });
                        res2 = new Request(raw.url, {
                            body: str2,
                            headers: raw.headers,
                            method: raw.method
                        });
                        return [2 /*return*/, [res1, res2]];
                }
            });
        });
    };
    JopiRequest.prototype.duplicateResponse = function (raw) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, str1, str2, res1, res2;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.duplicateReadableStream(raw.body)];
                    case 1:
                        _a = _b.sent(), str1 = _a[0], str2 = _a[1];
                        res1 = new Response(str1, {
                            status: raw.status,
                            headers: raw.headers
                        });
                        res2 = new Response(str2, {
                            status: raw.status,
                            headers: raw.headers
                        });
                        return [2 /*return*/, [res1, res2]];
                }
            });
        });
    };
    JopiRequest.prototype.spyRequest = function (handleRequest) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, this.spyRequestData(handleRequest, function (data) {
                        _this.printSpyRequestData(data);
                    })];
            });
        });
    };
    JopiRequest.prototype.printSpyRequestData = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            var headerColor, titleColor, resAsText, res, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        headerColor = jk_term.buildWriter(jk_term.C_RED);
                        titleColor = jk_term.buildWriter(jk_term.C_ORANGE);
                        resAsText = "";
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 7, , 8]);
                        if (!data.res) return [3 /*break*/, 5];
                        res = data.res();
                        if (!!res) return [3 /*break*/, 2];
                        resAsText = "[NO SET]";
                        return [3 /*break*/, 4];
                    case 2: return [4 /*yield*/, res.text()];
                    case 3:
                        resAsText = _b.sent();
                        _b.label = 4;
                    case 4: return [3 /*break*/, 6];
                    case 5:
                        resAsText = "[NO SET]";
                        _b.label = 6;
                    case 6: return [3 /*break*/, 8];
                    case 7:
                        _a = _b.sent();
                        return [3 /*break*/, 8];
                    case 8:
                        console.log();
                        console.log(headerColor(this.method, this.url));
                        console.log(titleColor("|- referer: "), data.reqReferer);
                        console.log(titleColor("|- reqContentType:"), data.reqContentType);
                        console.log(titleColor("|- reqData:"), data.reqData);
                        console.log(titleColor("|- reqCookie:"), data.reqCookies);
                        console.log(titleColor("|- resContentType:"), data.resContentType);
                        console.log(titleColor("|- resCookieSet:"), data.resCookieSet);
                        console.log(titleColor("|- resHeaders:"), data.resHeaders);
                        console.log(titleColor("|- resData:"), resAsText);
                        return [2 /*return*/];
                }
            });
        });
    };
    JopiRequest.prototype.spyRequestData = function (handleRequest, onSpy) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, bunNewReq, spyReq, res, _b, bunNewRes, spyRes, _c;
            var _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0: return [4 /*yield*/, this.duplicateRawRequest(this.coreRequest)];
                    case 1:
                        _a = _e.sent(), bunNewReq = _a[0], spyReq = _a[1];
                        // Required because the body is already consumed.
                        this.coreRequest = bunNewReq;
                        return [4 /*yield*/, handleRequest(this)];
                    case 2:
                        res = _e.sent();
                        return [4 /*yield*/, this.duplicateResponse(res)];
                    case 3:
                        _b = _e.sent(), bunNewRes = _b[0], spyRes = _b[1];
                        // Required because the body is already consumed.
                        this.coreRequest = spyReq;
                        _c = onSpy;
                        _d = {
                            method: this.method,
                            res: function () { return spyRes; },
                            reqUrl: this.url,
                            reqReferer: this.headers.get("referer"),
                            reqContentType: this.reqContentType
                        };
                        return [4 /*yield*/, this.getReqDataInfos()];
                    case 4:
                        _c.apply(void 0, [(_d.reqData = _e.sent(),
                                _d.resContentType = res.headers.get("content-type"),
                                _d.resContentTypeCat = this.getContentTypeCategory(res),
                                _d.reqCookies = this.headers.get("cookie"),
                                _d.resCookieSet = spyRes.headers.getSetCookie(),
                                _d.resStatus = spyRes.status,
                                _d.resLocation = spyRes.headers.get("location"),
                                _d.resHeaders = spyRes.headers,
                                _d), this]);
                        return [2 /*return*/, bunNewRes];
                }
            });
        });
    };
    //endregion
    //region Cookies
    JopiRequest.prototype.hasCookie = function (name, value) {
        if (!this.cookies)
            this.cookies = parseCookies(this.coreRequest.headers);
        if (value)
            return this.cookies[name] === value;
        return this.cookies[name] !== undefined;
    };
    JopiRequest.prototype.getCookie = function (name) {
        if (!this.cookies)
            this.cookies = parseCookies(this.coreRequest.headers);
        return this.cookies[name];
    };
    JopiRequest.prototype.hookIfCookie = function (res, name, testCookieValue) {
        var hooks = [];
        for (var _i = 3; _i < arguments.length; _i++) {
            hooks[_i - 3] = arguments[_i];
        }
        return __awaiter(this, void 0, void 0, function () {
            var cookieValue, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        cookieValue = this.getCookie(name);
                        if (!cookieValue) return [3 /*break*/, 2];
                        if (testCookieValue && !testCookieValue(cookieValue)) {
                            return [2 /*return*/, Promise.resolve(res)];
                        }
                        _a = this.htmlResponse;
                        return [4 /*yield*/, this.applyTextModifiers(res, hooks)];
                    case 1: return [2 /*return*/, _a.apply(this, [_b.sent()])];
                    case 2: return [2 /*return*/, Promise.resolve(res)];
                }
            });
        });
    };
    JopiRequest.prototype.addCookie = function (res, cookieName, cookieValue, options) {
        var cookie = "".concat(cookieName, "=").concat(cookieValue, ";");
        if (options) {
            if (options.maxAge) {
                cookie += " Max-Age=".concat(options.maxAge, ";");
            }
        }
        var current = res.headers.get("set-cookie");
        if (current)
            cookie = current + cookie;
        res.headers.append("set-cookie", cookie);
    };
    //endregion
    //region ReactJS
    /**
     * Allow rendering a document fully formed from a React component.
     */
    JopiRequest.prototype.reactResponse = function (E) {
        return this.htmlResponse(ReactServer.renderToStaticMarkup(E));
    };
    JopiRequest.prototype.reactToString = function (element) {
        return ReactServer.renderToStaticMarkup(element);
    };
    /**
     * The new render function.
     * Used while refactoring the renderer.
     * Used while refactoring the renderer.
     */
    JopiRequest.prototype.reactPage = function (routeKey, C) {
        return __awaiter(this, void 0, void 0, function () {
            var html, e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 1, , 3]);
                        html = this.renderPageToHtml(routeKey, C);
                        return [2 /*return*/, new Response(html, { status: 200, headers: { "content-type": "text/html;charset=utf-8" } })];
                    case 1:
                        e_1 = _a.sent();
                        console.error(e_1);
                        return [4 /*yield*/, this.returnError500_ServerError(e_1)];
                    case 2: return [2 /*return*/, _a.sent()];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    JopiRequest.prototype.renderPageToHtml = function (pageKey, C) {
        // What we will include in our HTML.
        var options = {
            head: [<link key="jopi.mainBundle" rel="stylesheet" type="text/css" href={"/_bundle/" + pageKey + ".css"}/>],
            bodyEnd: [<script key="jopi.mainSript" type="module" src={"/_bundle/" + pageKey + ".js"}></script>]
        };
        // Allow faking the environment of the page.
        var controller = new PageController_ExposePrivate(false, options);
        controller.setServerRequest(this);
        this.webSite.executeBrowserInstall(controller);
        return ReactServer.renderToStaticMarkup(<Page controller={controller}><C /></Page>);
    };
    //endregion
    //region JQuery
    JopiRequest.prototype.asJquery = function (html) {
        var res = cheerio.load(html);
        initCheerio(res);
        return res;
    };
    JopiRequest.prototype.$ = function (html) {
        var res = cheerio.load(html);
        initCheerio(res);
        return res;
    };
    //endregion
    //region JWT Tokens
    /**
     * Create a JWT token with the data.
     */
    JopiRequest.prototype.createJwtToken = function (data) {
        return this.userJwtToken = this.webSite.createJwtToken(data);
    };
    /**
     * Extract the JWT token from the Authorization header.
     */
    JopiRequest.prototype.getJwtToken = function () {
        if (this.userJwtToken) {
            return this.userJwtToken;
        }
        if (this.hasNoUserInfos) {
            return undefined;
        }
        var authHeader = this.headers.get("authorization");
        if (authHeader) {
            if (authHeader.startsWith("Bearer ")) {
                return this.userJwtToken = authHeader.slice(7);
            }
        }
        var authCookie = this.getCookie("authorization");
        if (authCookie) {
            if (authCookie.startsWith("jwt ")) {
                return this.userJwtToken = authCookie.slice(4);
            }
        }
        return undefined;
    };
    /**
     * Try to sign in the user with information you provide.
     * Return true if he is signed in, false otherwise.
     *
     * If signed in, then it automatically adds the Authorization header.
     *
     * @param loginInfo
     *      Information with things like login/password-hash/...
     *      Must match with you have used with webSite.setUserLoginManager.
     */
    JopiRequest.prototype.tryAuthWithJWT = function (loginInfo) {
        return __awaiter(this, void 0, void 0, function () {
            var authResult;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.webSite.tryAuthUser(loginInfo)];
                    case 1:
                        authResult = _a.sent();
                        if (authResult.isOk) {
                            if (!authResult.authToken) {
                                authResult.authToken = this.createJwtToken(authResult.userInfos);
                            }
                            // The token will be added to cookie "authorization" in the post-process step.
                            this.userJwtToken = authResult.authToken;
                            this.userInfos = authResult.userInfos;
                            // --> The cookie will be stored inside the response
                            //     through the WebSite.applyMiddlewares / call to storeJwtToken.
                            return [2 /*return*/, authResult];
                        }
                        this.userInfos = undefined;
                        this.userJwtToken = undefined;
                        return [2 /*return*/, authResult];
                }
            });
        });
    };
    /**
     * Verify and decode the JWT token.
     * Once done, the data is saved and can be read through req.userTokenData.
     */
    JopiRequest.prototype.decodeJwtToken = function () {
        var token = this.getJwtToken();
        if (!token)
            return undefined;
        return this.webSite.decodeJwtToken(token);
    };
    JopiRequest.prototype.getUserInfos = function () {
        if (this.userInfos)
            return this.userInfos;
        if (this.hasNoUserInfos)
            return undefined;
        var userInfos = this.decodeJwtToken();
        if (userInfos) {
            this.userInfos = userInfos;
            return userInfos;
        }
        this.hasNoUserInfos = true;
        return undefined;
    };
    JopiRequest.prototype.requireUserInfos = function () {
        var userInfos = this.getUserInfos();
        if (!userInfos)
            throw new SBPE_NotAuthorizedException();
        return userInfos;
    };
    //endregion
    //region User roles
    /**
     * Returns the roles of the user.
     */
    JopiRequest.prototype.getUserRoles = function () {
        var userInfos = this.getUserInfos();
        if (!userInfos || !userInfos.roles)
            return [];
        return userInfos.roles;
    };
    /**
     * Check if the user has all these roles.
     * Return true if ok, false otherwise.
     */
    JopiRequest.prototype.userHasRoles = function (requiredRoles) {
        var userInfos = this.getUserInfos();
        if (!userInfos)
            return false;
        var userRoles = userInfos.roles;
        if (!userRoles)
            return false;
        for (var _i = 0, requiredRoles_1 = requiredRoles; _i < requiredRoles_1.length; _i++) {
            var role = requiredRoles_1[_i];
            if (!userRoles.includes(role))
                return false;
        }
        return true;
    };
    JopiRequest.prototype.assertUserHasRoles = function (requiredRoles) {
        if (!this.userHasRoles(requiredRoles)) {
            throw new SBPE_NotAuthorizedException();
        }
    };
    //endregion
    JopiRequest.prototype.filterSearchParams = function (filter) {
        if (filter) {
            filter(this.urlInfos);
        }
        else {
            if (this.routeInfos.searchParamFilter) {
                this.routeInfos.searchParamFilter(this.urlInfos);
            }
        }
    };
    JopiRequest.prototype.getContentTypeOf = function (response) {
        return response.headers.get("content-type");
    };
    JopiRequest.prototype.returnFile = function (filePath) {
        return __awaiter(this, void 0, void 0, function () {
            var res;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.tryReturnFile(filePath)];
                    case 1:
                        res = _a.sent();
                        if (res)
                            return [2 /*return*/, res];
                        return [2 /*return*/, this.returnError404_NotFound()];
                }
            });
        });
    };
    JopiRequest.prototype.tryReturnFile = function (filePath) {
        return __awaiter(this, void 0, void 0, function () {
            var stats, contentType, contentLength, headers;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, jk_fs.getFileStat(filePath)];
                    case 1:
                        stats = _a.sent();
                        if (stats && stats.isFile()) {
                            contentType = jk_fs.getMimeTypeFromName(filePath);
                            contentLength = stats.size;
                            headers = {
                                "content-type": contentType,
                                "content-length": contentLength.toString()
                            };
                            return [2 /*return*/, jk_fs.createResponseFromFile(filePath, 200, headers)];
                        }
                        return [2 /*return*/, undefined];
                }
            });
        });
    };
    /**
     * Allow serving a file as a response.
     * Automatically get the file from the url and a root dir.
     */
    JopiRequest.prototype.serveFromDir = function (filesRootPath, options) {
        return __awaiter(this, void 0, void 0, function () {
            var sfc, fromCache;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        options = options || gEmptyObject;
                        if (options.replaceIndexHtml !== false) {
                            if (this.urlInfos.pathname.endsWith("/index.html")) {
                                this.urlInfos.pathname = this.urlInfos.pathname.slice(0, -10);
                                return [2 /*return*/, this.redirectResponse(false)];
                            }
                            if (this.urlInfos.pathname.endsWith("/")) {
                                this.urlInfos.pathname += "index.html";
                            }
                        }
                        sfc = new WebSiteMirrorCache(filesRootPath);
                        return [4 /*yield*/, sfc.getFromCache(this.urlInfos)];
                    case 1:
                        fromCache = _a.sent();
                        if (fromCache)
                            return [2 /*return*/, fromCache];
                        if (options.onNotFound) {
                            return [2 /*return*/, options.onNotFound(this)];
                        }
                        return [2 /*return*/, this.returnError404_NotFound()];
                }
            });
        });
    };
    return JopiRequest;
}());
export { JopiRequest };
export var ContentTypeCategory;
(function (ContentTypeCategory) {
    ContentTypeCategory[ContentTypeCategory["OTHER"] = 0] = "OTHER";
    ContentTypeCategory[ContentTypeCategory["_TEXT_"] = 10] = "_TEXT_";
    ContentTypeCategory[ContentTypeCategory["TEXT_HTML"] = 11] = "TEXT_HTML";
    ContentTypeCategory[ContentTypeCategory["TEXT_CSS"] = 12] = "TEXT_CSS";
    ContentTypeCategory[ContentTypeCategory["TEXT_JAVASCRIPT"] = 13] = "TEXT_JAVASCRIPT";
    ContentTypeCategory[ContentTypeCategory["TEXT_JSON"] = 14] = "TEXT_JSON";
    ContentTypeCategory[ContentTypeCategory["_FORM_"] = 20] = "_FORM_";
    ContentTypeCategory[ContentTypeCategory["FORM_MULTIPART"] = 20] = "FORM_MULTIPART";
    ContentTypeCategory[ContentTypeCategory["FORM_URL_ENCODED"] = 21] = "FORM_URL_ENCODED";
    ContentTypeCategory[ContentTypeCategory["_BINARY_"] = 30] = "_BINARY_";
    ContentTypeCategory[ContentTypeCategory["IMAGE"] = 31] = "IMAGE";
})(ContentTypeCategory || (ContentTypeCategory = {}));
var gEmptyObject = {};
