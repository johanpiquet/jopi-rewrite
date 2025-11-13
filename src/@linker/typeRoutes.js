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
import { ArobaseType, FilePart, getWriter, InstallFileType, PriorityLevel, resolveFile } from "./engine.ts";
import * as jk_fs from "jopi-toolkit/jk_fs";
import * as jk_app from "jopi-toolkit/jk_app";
var TypeRoutes = /** @class */ (function (_super) {
    __extends(TypeRoutes, _super);
    function TypeRoutes() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.sourceCode_header = "import {routeBindPage, routeBindVerb} from \"jopi-rewrite/generated\";";
        _this.sourceCode_body = "";
        _this.outputDir = "";
        _this.cwdDir = process.cwd();
        _this.routeCount = 1;
        _this.registry = {};
        _this.routeConfig = {};
        return _this;
    }
    TypeRoutes.prototype.beginGeneratingCode = function (writer) {
        return __awaiter(this, void 0, void 0, function () {
            var _i, _a, item, count, _b, _c, route, configFile, relPath, filePath;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        for (_i = 0, _a = Object.values(this.registry); _i < _a.length; _i++) {
                            item = _a[_i];
                            if (item.verb === "PAGE") {
                                this.bindPage(item.route, item.filePath, item.attributs);
                            }
                            else {
                                this.bindVerb(item.verb, item.route, item.filePath, item.attributs);
                            }
                        }
                        if (Object.keys(this.routeConfig).length > 0) {
                            this.sourceCode_header += "\nimport {RouteConfig} from \"jopi-rewrite\";";
                            count = 1;
                            for (_b = 0, _c = Object.keys(this.routeConfig); _b < _c.length; _b++) {
                                route = _c[_b];
                                configFile = this.routeConfig[route];
                                relPath = jk_fs.getRelativePath(writer.dir.output_dir, configFile);
                                this.sourceCode_header += "\nimport routeConfig".concat(count, " from \"").concat(relPath, "\";");
                                this.sourceCode_body += "\n    await routeConfig".concat(count, "(new RouteConfig(webSite, ").concat(JSON.stringify(route), "));");
                                count++;
                            }
                        }
                        this.sourceCode_body = "\n\nexport default async function(webSite) {".concat(this.sourceCode_body, "\n}");
                        filePath = jk_fs.join(writer.dir.output_dir, "declareServerRoutes.js");
                        return [4 /*yield*/, jk_fs.writeTextToFile(filePath, this.sourceCode_header + this.sourceCode_body)];
                    case 1:
                        _d.sent();
                        writer.genAddToInstallFile(InstallFileType.server, FilePart.imports, "\nimport declareRoutes from \"./declareServerRoutes.js\";");
                        writer.genAddToInstallFile(InstallFileType.server, FilePart.footer, "\n    onWebSiteCreated((webSite) => declareRoutes(webSite));");
                        return [2 /*return*/];
                }
            });
        });
    };
    TypeRoutes.prototype.processDir = function (p) {
        return __awaiter(this, void 0, void 0, function () {
            var dirAttributs;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.outputDir = getWriter().dir.output_dir;
                        return [4 /*yield*/, this.scanAttributs(p.arobaseDir)];
                    case 1:
                        dirAttributs = _a.sent();
                        //
                        if (dirAttributs.configFile) {
                            this.routeConfig["/"] = dirAttributs.configFile;
                        }
                        return [4 /*yield*/, this.scanDir(p.arobaseDir, "/", dirAttributs)];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    TypeRoutes.prototype.bindPage = function (route, filePath, attributs) {
        var routeId = "r" + (this.routeCount++);
        var srcFilePath = jk_fs.getRelativePath(this.cwdDir, filePath);
        filePath = jk_app.getCompiledFilePathFor(filePath);
        var distFilePath = jk_fs.getRelativePath(this.outputDir, filePath);
        this.sourceCode_header += "\nimport c_".concat(routeId, " from \"").concat(distFilePath, "\";");
        this.sourceCode_body += "\n    await routeBindPage(webSite, ".concat(JSON.stringify(route), ", ").concat(JSON.stringify(attributs), ", c_").concat(routeId, ", ").concat(JSON.stringify(srcFilePath), ");");
    };
    TypeRoutes.prototype.bindVerb = function (verb, route, filePath, attributs) {
        var routeId = "r" + (this.routeCount++);
        var relPath = jk_fs.getRelativePath(this.outputDir, filePath);
        this.sourceCode_header += "\nimport f_".concat(routeId, " from \"").concat(relPath, "\";");
        this.sourceCode_body += "\n    await routeBindVerb(webSite,  ".concat(JSON.stringify(route), ", ").concat(JSON.stringify(verb), ", ").concat(JSON.stringify(attributs), ", f_").concat(routeId, ");");
    };
    TypeRoutes.prototype.normalizeFeatureName = function (feature) {
        if (feature === "cache") {
            return "cache";
        }
        feature = feature.replaceAll("-", "");
        feature = feature.replaceAll("_", "");
        if (feature === "autocache") {
            return "cache";
        }
        return undefined;
    };
    TypeRoutes.prototype.normalizeConditionName = function (condName, ctx) {
        var needRoleIdx = condName.toLowerCase().indexOf("needrole");
        if (needRoleIdx === -1)
            return undefined;
        var target = condName.substring(0, needRoleIdx).toUpperCase();
        var role = condName.substring(needRoleIdx + 8).toLowerCase();
        if ((role[0] === '_') || (role[0] === '-'))
            role = role.substring(1);
        if (!ctx[target])
            ctx[target] = [role];
        else
            ctx[target].push(role);
        target = target.toLowerCase();
        if (target === "page")
            target = "get";
        return target + "NeedRole_" + role;
    };
    TypeRoutes.prototype.scanAttributs = function (dirPath) {
        return __awaiter(this, void 0, void 0, function () {
            var res, infos, _a;
            var _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        res = { needRoles: {} };
                        return [4 /*yield*/, this.dir_extractInfos(dirPath, {
                                allowConditions: true,
                                requirePriority: true,
                                requireRefFile: false,
                                conditionCheckingContext: res.needRoles
                            })];
                    case 1:
                        infos = _c.sent();
                        _a = res;
                        return [4 /*yield*/, resolveFile(dirPath, ["config.tsx", "config.ts"])];
                    case 2:
                        _a.configFile = _c.sent();
                        res.disableCache = (((_b = infos.features) === null || _b === void 0 ? void 0 : _b["cache"]) === true) ? true : undefined;
                        res.priority = infos.priority;
                        if (!Object.values(res.needRoles).length) {
                            res.needRoles = undefined;
                        }
                        return [2 /*return*/, res];
                }
            });
        });
    };
    TypeRoutes.prototype.addToRegistry = function (item) {
        var key = item.route + ' ' + item.verb;
        var current = this.registry[key];
        if (!current) {
            this.registry[key] = item;
            return;
        }
        var newPriority = item.attributs.priority || PriorityLevel.default;
        var currentPriority = current.attributs.priority || PriorityLevel.default;
        if (newPriority > currentPriority) {
            this.registry[key] = item;
        }
    };
    TypeRoutes.prototype.scanDir = function (dir, route, attributs) {
        return __awaiter(this, void 0, void 0, function () {
            var dirItems, _i, dirItems_1, dirItem, segment, newRoute, dirAttributs, name_1, idx;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, jk_fs.listDir(dir)];
                    case 1:
                        dirItems = _a.sent();
                        _i = 0, dirItems_1 = dirItems;
                        _a.label = 2;
                    case 2:
                        if (!(_i < dirItems_1.length)) return [3 /*break*/, 7];
                        dirItem = dirItems_1[_i];
                        if (dirItem.name[0] === '.')
                            return [3 /*break*/, 6];
                        if (!dirItem.isDirectory) return [3 /*break*/, 5];
                        segment = convertRouteSegment(dirItem.name);
                        newRoute = route === "/" ? route + segment : route + "/" + segment;
                        return [4 /*yield*/, this.scanAttributs(dirItem.fullPath)];
                    case 3:
                        dirAttributs = _a.sent();
                        if (dirAttributs.configFile) {
                            this.routeConfig[newRoute] = dirAttributs.configFile;
                        }
                        return [4 /*yield*/, this.scanDir(dirItem.fullPath, newRoute, dirAttributs)];
                    case 4:
                        _a.sent();
                        return [3 /*break*/, 6];
                    case 5:
                        if (dirItem.isFile) {
                            name_1 = dirItem.name;
                            if (name_1.endsWith(".tsx") || name_1.endsWith(".ts")) {
                                idx = name_1.lastIndexOf(".");
                                name_1 = name_1.substring(0, idx);
                                switch (name_1) {
                                    case "index.page":
                                        this.addToRegistry({ verb: "PAGE", route: route, filePath: dirItem.fullPath, attributs: attributs });
                                        break;
                                    case "onGET":
                                        this.addToRegistry({ verb: "GET", route: route, filePath: dirItem.fullPath, attributs: attributs });
                                        break;
                                    case "onPOST":
                                        this.addToRegistry({ verb: "POST", route: route, filePath: dirItem.fullPath, attributs: attributs });
                                        break;
                                    case "onPUT":
                                        this.addToRegistry({ verb: "PUT", route: route, filePath: dirItem.fullPath, attributs: attributs });
                                        break;
                                    case "onDELETE":
                                        this.addToRegistry({ verb: "DELETE", route: route, filePath: dirItem.fullPath, attributs: attributs });
                                        break;
                                    case "onHEAD":
                                        this.addToRegistry({ verb: "HEAD", route: route, filePath: dirItem.fullPath, attributs: attributs });
                                        break;
                                    case "onPATCH":
                                        this.addToRegistry({ verb: "PATCH", route: route, filePath: dirItem.fullPath, attributs: attributs });
                                        break;
                                    case "onOPTIONS":
                                        this.addToRegistry({ verb: "OPTIONS", route: route, filePath: dirItem.fullPath, attributs: attributs });
                                        break;
                                }
                            }
                        }
                        _a.label = 6;
                    case 6:
                        _i++;
                        return [3 /*break*/, 2];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    return TypeRoutes;
}(ArobaseType));
export default TypeRoutes;
function convertRouteSegment(segment) {
    if (segment.startsWith("[") && segment.endsWith("]")) {
        segment = segment.substring(1, segment.length - 1);
        if ((segment === "...") || (segment === "..")) {
            return "**";
        }
        return ":" + segment;
    }
    return segment;
}
