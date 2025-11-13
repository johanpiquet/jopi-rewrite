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
import * as jk_fs from "jopi-toolkit/jk_fs";
import { getBundleDirPath } from "../bundler/common.ts";
import { isDevUiEnabled } from "jopi-rewrite/loader-client";
export function onSseEvent(sseEvent) {
    return __awaiter(this, void 0, void 0, function () {
        var me, stream;
        return __generator(this, function (_a) {
            me = {};
            stream = new ReadableStream({
                start: function (controller) {
                    var nodeSseEvent = sseEvent;
                    if (!nodeSseEvent.clients) {
                        nodeSseEvent.clients = [];
                        var controller_1 = {
                            send: function (eventName, data) {
                                var toSend = "event: ".concat(eventName, "\ndata: ").concat(JSON.stringify({ message: data }), "\n\n");
                                var encoder = new TextEncoder();
                                var encodedData = encoder.encode(toSend);
                                nodeSseEvent.clients.forEach(function (e) { e.controller.enqueue(encodedData); });
                                console.log("sse - sending to", nodeSseEvent.clients.length, "clients");
                            },
                            close: function () {
                                nodeSseEvent.clients.forEach(function (e) {
                                    e.controller.close();
                                });
                                nodeSseEvent.clients = [];
                            }
                        };
                        nodeSseEvent.handler(controller_1);
                    }
                    nodeSseEvent.clients.push({ controller: controller, me: me });
                    var initialData = sseEvent.getWelcomeMessage();
                    var encoder = new TextEncoder();
                    controller.enqueue(encoder.encode("data: ".concat(initialData, "\n\n")));
                },
                cancel: function () {
                    var nodeSseEvent = sseEvent;
                    nodeSseEvent.clients = nodeSseEvent.clients.filter(function (e) { return e.me !== me; });
                }
            });
            return [2 /*return*/, new Response(stream, {
                    headers: {
                        'Content-Type': 'text/event-stream',
                        'Cache-Control': 'no-cache',
                        'Connection': 'keep-alive'
                    }
                })];
        });
    });
}
//endregion
//region ServerInstanceProvider
var BunJsServerInstanceBuilder = /** @class */ (function () {
    function BunJsServerInstanceBuilder(webSite) {
        this.webSite = webSite;
        this.serverRoutes = {};
        this.pageToBuild = {};
        this.isReactHmrEnabled = isDevUiEnabled();
    }
    BunJsServerInstanceBuilder.prototype.addRoute = function (verb, path, route) {
        if (!this.serverRoutes[path]) {
            this.serverRoutes[path] = {};
        }
        var webSite = this.webSite;
        this.serverRoutes[path][verb] = function (req, server) {
            return webSite.processRequest(route.handler, req.params, route, undefined, req, server);
        };
    };
    BunJsServerInstanceBuilder.prototype.addWsRoute = function (path, handler) {
        //TODO
    };
    BunJsServerInstanceBuilder.prototype.addSseEVent = function (path, handler) {
        var _this = this;
        handler = __assign({}, handler);
        this.addRoute("GET", path, {
            handler: function (_) { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, onSseEvent(handler)];
                });
            }); }
        });
    };
    BunJsServerInstanceBuilder.prototype.addPage = function (path, pageKey, reactComponent, routeInfos) {
        var _this = this;
        if (this.isReactHmrEnabled) {
            this.pageToBuild[path] = pageKey;
            return;
        }
        routeInfos.handler = function (req) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, req.reactPage(pageKey, reactComponent)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        }); };
        routeInfos.handler = this.webSite.applyMiddlewares("GET", path, routeInfos.handler);
        this.addRoute("GET", path, routeInfos);
    };
    BunJsServerInstanceBuilder.prototype.updateTlsCertificate = function (certificate) {
        this.serverOptions.tls = certificate;
        // Will reload without breaking the current connections.
        // @ts-ignore
        this.bunServer.reload(this.serverOptions);
    };
    BunJsServerInstanceBuilder.prototype.buildPage = function (path, pageKey) {
        return __awaiter(this, void 0, void 0, function () {
            var genDir, htmlFilePath, _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        genDir = getBundleDirPath(this.webSite);
                        htmlFilePath = jk_fs.join(genDir, pageKey + ".html");
                        if (!this.serverRoutes[path])
                            this.serverRoutes[path] = {};
                        _a = this.serverRoutes[path];
                        _b = "GET";
                        return [4 /*yield*/, import(htmlFilePath)];
                    case 1:
                        _a[_b] = (_c.sent()).default;
                        return [2 /*return*/];
                }
            });
        });
    };
    BunJsServerInstanceBuilder.prototype.startServer = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var options, _a, _b, _c, _i, path, pageKey;
            var _this = this;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        options = {
                            port: String(params.port),
                            tls: params.tls,
                            routes: this.serverRoutes,
                            fetch: function (req) { return __awaiter(_this, void 0, void 0, function () {
                                var urlInfos;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            urlInfos = new URL(req.url);
                                            return [4 /*yield*/, this.webSite.processRequest(undefined, {}, undefined, urlInfos, req, this.bunServer)];
                                        case 1: return [2 /*return*/, _a.sent()];
                                    }
                                });
                            }); },
                            development: this.isReactHmrEnabled && {
                                // Enable browser hot reloading in development
                                hmr: true,
                                // Echo console logs from the browser to the server
                                console: true,
                            }
                        };
                        _a = this.pageToBuild;
                        _b = [];
                        for (_c in _a)
                            _b.push(_c);
                        _i = 0;
                        _d.label = 1;
                    case 1:
                        if (!(_i < _b.length)) return [3 /*break*/, 4];
                        _c = _b[_i];
                        if (!(_c in _a)) return [3 /*break*/, 3];
                        path = _c;
                        pageKey = this.pageToBuild[path];
                        return [4 /*yield*/, this.buildPage(path, pageKey)];
                    case 2:
                        _d.sent();
                        _d.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4:
                        this.serverOptions = options;
                        // @ts-ignore
                        return [2 /*return*/, this.bunServer = Bun.serve(options)];
                }
            });
        });
    };
    return BunJsServerInstanceBuilder;
}());
export { BunJsServerInstanceBuilder };
//endregion
