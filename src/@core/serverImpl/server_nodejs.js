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
import http from "node:http";
import https from "node:https";
import { WebSocketServer } from "ws";
import * as jk_fs from "jopi-toolkit/jk_fs";
import { SBPE_MustReturnWithoutResponseException } from "../jopiWebSite.tsx";
import { addRoute, createRouter, findRoute } from "rou3";
var NodeServerInstance = /** @class */ (function () {
    function NodeServerInstance(options) {
        this.options = options;
        var isHttps = options.tls !== undefined;
        function handler(req, res) {
            return __awaiter(this, void 0, void 0, function () {
                var headers, method, body, webReq, webRes, resHeaders, asJson, asNodeStream;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            headers = new Headers(req.headers);
                            method = req.method;
                            body = (method == "GET" || method === "HEAD") ? undefined : jk_fs.nodeStreamToWebStream(req);
                            webReq = new Request((isHttps ? "https://" : "http://") + req.headers.host + req.url, {
                                body: body,
                                headers: headers,
                                method: method,
                                // @ts-ignore
                                duplex: "half"
                            });
                            // @ts-ignore
                            webReq.nodeJsReq = req;
                            // @ts-ignore
                            webReq.nodeJsRes = res;
                            webRes = reqFetch(webReq);
                            if (!(webRes instanceof Promise)) return [3 /*break*/, 2];
                            return [4 /*yield*/, webRes];
                        case 1:
                            webRes = _a.sent();
                            _a.label = 2;
                        case 2:
                            if (webRes === undefined)
                                return [2 /*return*/];
                            resHeaders = webRes.headers;
                            asJson = {};
                            resHeaders.forEach(function (value, key) { return asJson[key] = value; });
                            res.writeHead(webRes.status, asJson);
                            if (webRes.body) {
                                asNodeStream = jk_fs.webStreamToNodeStream(webRes.body);
                                asNodeStream.pipe(res);
                            }
                            else {
                                res.end("");
                            }
                            return [2 /*return*/];
                    }
                });
            });
        }
        var reqFetch = options.fetch;
        if (options.tls) {
            var key = "", cert = "";
            if (options.tls instanceof Array) {
                for (var _i = 0, _a = options.tls; _i < _a.length; _i++) {
                    var tls = _a[_i];
                    key += tls.key;
                    cert += tls.cert;
                }
            }
            else {
                key = options.tls.key;
                cert = options.tls.cert;
            }
            this.server = https.createServer({ key: key, cert: cert }, handler);
        }
        else {
            this.server = http.createServer(handler);
        }
        var onWebSocketConnection = options.onWebSocketConnection;
        if (onWebSocketConnection) {
            var wss = new WebSocketServer({ server: this.server });
            wss.on('connection', function (ws, req) {
                onWebSocketConnection(ws, {
                    url: "https://" + req.headers.host + req.url,
                    headers: new Headers(req.headers)
                });
            });
        }
    }
    NodeServerInstance.prototype.requestIP = function (req) {
        // @ts-ignore
        var nodeReq = req.nodeJsReq;
        return {
            address: nodeReq.socket.remoteAddress,
            port: nodeReq.socket.remotePort,
            family: nodeReq.socket.remoteFamily
        };
    };
    NodeServerInstance.prototype.stop = function (_closeActiveConnections) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                this.server.close();
                return [2 /*return*/];
            });
        });
    };
    NodeServerInstance.prototype.timeout = function (_req, _seconds) {
        // Timeout is managed globally for all the requests.
    };
    NodeServerInstance.prototype.start = function () {
        this.server.listen(this.options.port);
    };
    return NodeServerInstance;
}());
export function onSseEvent(sseEvent, rawReq) {
    return __awaiter(this, void 0, void 0, function () {
        var req, res, nodeSseEvent, controller;
        return __generator(this, function (_a) {
            req = rawReq.nodeJsReq;
            res = rawReq.nodeJsRes;
            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            });
            res.write("data: ".concat(sseEvent.getWelcomeMessage(), "\n\n"));
            nodeSseEvent = sseEvent;
            if (!nodeSseEvent.clients) {
                nodeSseEvent.clients = [];
                controller = {
                    send: function (eventName, data) {
                        var toSend = "event: ".concat(eventName, "\ndata: ").concat(JSON.stringify({ message: data }), "\n\n");
                        nodeSseEvent.clients.forEach(function (res) { res.write(toSend); });
                    },
                    close: function () {
                        nodeSseEvent.clients.forEach(function (res) {
                            if (!res.closed) {
                                res.end();
                            }
                        });
                        nodeSseEvent.clients = [];
                    }
                };
                nodeSseEvent.handler(controller);
            }
            nodeSseEvent.clients.push(res);
            req.on('close', function () {
                nodeSseEvent.clients = nodeSseEvent.clients.filter(function (client) { return client !== res; });
            });
            // Allow bubbling up.
            throw new SBPE_MustReturnWithoutResponseException();
        });
    });
}
//endregion
//region ServerInstanceProvider
var NodeJsServerInstanceBuilder = /** @class */ (function () {
    function NodeJsServerInstanceBuilder(webSite) {
        this.webSite = webSite;
        this.router = createRouter();
        this.wsRouter = createRouter();
    }
    NodeJsServerInstanceBuilder.prototype.addRoute = function (verb, path, routeInfos) {
        addRoute(this.router, verb, path, routeInfos);
    };
    NodeJsServerInstanceBuilder.prototype.addWsRoute = function (path, handler) {
        addRoute(this.wsRouter, "ws", path, handler);
    };
    NodeJsServerInstanceBuilder.prototype.addSseEVent = function (path, handler) {
        var _this = this;
        handler = __assign({}, handler);
        this.addRoute("GET", path, {
            handler: function (req) { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, onSseEvent(handler, req.coreRequest)];
                });
            }); }
        });
    };
    NodeJsServerInstanceBuilder.prototype.startServer = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            function fetch(req) {
                return __awaiter(this, void 0, void 0, function () {
                    var urlInfos, matched;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                urlInfos = new URL(req.url);
                                matched = findRoute(router, req.method, urlInfos.pathname);
                                if (!matched) return [3 /*break*/, 2];
                                return [4 /*yield*/, webSite.processRequest(matched.data.handler, matched.params, matched.data, urlInfos, req, server)];
                            case 1: return [2 /*return*/, _a.sent()];
                            case 2: return [4 /*yield*/, webSite.processRequest(undefined, {}, undefined, urlInfos, req, server)];
                            case 3: return [2 /*return*/, _a.sent()];
                        }
                    });
                });
            }
            var webSite, router, server;
            return __generator(this, function (_a) {
                webSite = this.webSite;
                router = this.router;
                server = new NodeServerInstance({
                    port: String(params.port),
                    tls: params.tls,
                    fetch: fetch,
                    onWebSocketConnection: function (ws, infos) {
                        //const urlInfos = new URL(infos.url);
                        //const jws = new JopiWebSocket(this.webSite, server, ws);
                        //TODO
                        //webSite.declareNewWebSocketConnection(jws, infos, urlInfos);
                    }
                });
                server.start();
                return [2 /*return*/, server];
            });
        });
    };
    NodeJsServerInstanceBuilder.prototype.updateTlsCertificate = function (certificate) {
        // Not available for node.js
    };
    NodeJsServerInstanceBuilder.prototype.addPage = function (path, pageKey, reactComponent, routeInfos) {
        var _this = this;
        routeInfos.handler = function (req) { return __awaiter(_this, void 0, void 0, function () {
            var path, redirectUrl;
            return __generator(this, function (_a) {
                path = req.urlInfos.pathname;
                if (!path.endsWith("/")) {
                    req.urlInfos.pathname += "/";
                    redirectUrl = req.urlInfos.href;
                    return [2 /*return*/, Response.redirect(redirectUrl, 301)];
                }
                return [2 /*return*/, req.reactPage(pageKey, reactComponent)];
            });
        }); };
        routeInfos.handler = this.webSite.applyMiddlewares("GET", path, routeInfos.handler);
        this.addRoute("GET", path, routeInfos);
    };
    return NodeJsServerInstanceBuilder;
}());
export { NodeJsServerInstanceBuilder };
//endregion
