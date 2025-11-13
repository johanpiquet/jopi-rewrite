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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
import * as jk_app from "jopi-toolkit/jk_app";
import * as jk_fs from "jopi-toolkit/jk_fs";
import path from "node:path";
import fs from "node:fs/promises";
import postcss from "postcss";
import tailwindPostcss from "@tailwindcss/postcss";
export function applyTailwindProcessor(params) {
    return __awaiter(this, void 0, void 0, function () {
        function append(text) {
            return fs.appendFile(outFilePath, "\n" + text + "\n", "utf-8");
        }
        var sourceFiles, outFilePath, postCss;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    sourceFiles = params.entryPoints;
                    outFilePath = path.resolve(params.genDir, "tailwind.css");
                    return [4 /*yield*/, jk_fs.isFile(outFilePath)];
                case 1:
                    if (!_a.sent()) return [3 /*break*/, 3];
                    return [4 /*yield*/, jk_fs.unlink(outFilePath)];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3: 
                // Assure the file exists.
                return [4 /*yield*/, fs.appendFile(outFilePath, "", "utf-8")];
                case 4:
                    // Assure the file exists.
                    _a.sent();
                    return [4 /*yield*/, applyPostCss(params, sourceFiles)];
                case 5:
                    postCss = _a.sent();
                    if (!postCss) return [3 /*break*/, 7];
                    return [4 /*yield*/, append(postCss)];
                case 6:
                    _a.sent();
                    _a.label = 7;
                case 7: return [2 /*return*/];
            }
        });
    });
}
/**
 * Generate Tailwind CSS file a list of source files and returns the CSS or undefined.
 */
function applyPostCss(params, sourceFiles) {
    return __awaiter(this, void 0, void 0, function () {
        var bundlerConfig, plugins, config, tailwindPlugin, globalCssContent, processor, result, e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!sourceFiles.length)
                        return [2 /*return*/, ""];
                    bundlerConfig = params.config;
                    plugins = [];
                    config = bundlerConfig.tailwind.config || {};
                    if (!config.content)
                        config.content = sourceFiles;
                    else
                        config.content = __spreadArray(__spreadArray([], sourceFiles, true), config.content, true);
                    if (bundlerConfig.tailwind.extraSourceFiles) {
                        if (!config.content)
                            config.content = [];
                        config.content = __spreadArray(__spreadArray([], config.content, true), bundlerConfig.tailwind.extraSourceFiles, true);
                    }
                    tailwindPlugin = bundlerConfig.tailwind.disable ? undefined : tailwindPostcss({ config: config });
                    if (bundlerConfig.postCss.initializer) {
                        plugins = bundlerConfig.postCss.initializer(sourceFiles, tailwindPlugin);
                    }
                    else if (tailwindPlugin) {
                        plugins = [tailwindPlugin];
                    }
                    else {
                        return [2 /*return*/, undefined];
                    }
                    if (!plugins.length)
                        return [2 /*return*/, undefined];
                    return [4 /*yield*/, getGlobalCssFileContent(bundlerConfig)];
                case 1:
                    globalCssContent = _a.sent();
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 5]);
                    processor = postcss(plugins);
                    return [4 /*yield*/, processor.process(globalCssContent, {
                            // Setting 'from' allows resolving correctly the node_modules resolving.
                            from: params.outputDir
                        })];
                case 3:
                    result = _a.sent();
                    return [2 /*return*/, result.css];
                case 4:
                    e_1 = _a.sent();
                    console.error("Error while compiling for Tailwind:", e_1);
                    return [2 /*return*/, undefined];
                case 5: return [2 /*return*/];
            }
        });
    });
}
export function getGlobalCssFileContent(config) {
    return __awaiter(this, void 0, void 0, function () {
        var found, rootDir;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (config.tailwind.globalCssContent) {
                        return [2 /*return*/, config.tailwind.globalCssContent];
                    }
                    if (!config.tailwind.globalCssFilePath) return [3 /*break*/, 2];
                    return [4 /*yield*/, jk_fs.isFile(config.tailwind.globalCssFilePath)];
                case 1:
                    if (!(_a.sent())) {
                        throw new Error("Tailwind - File not found where resolving 'global.css': ".concat(config.tailwind.globalCssFilePath));
                    }
                    return [2 /*return*/, jk_fs.readTextFromFile(config.tailwind.globalCssFilePath)];
                case 2: return [4 /*yield*/, getTailwindTemplateFromShadCnConfig()];
                case 3:
                    found = _a.sent();
                    if (found)
                        return [2 /*return*/, found];
                    rootDir = jk_fs.dirname(jk_app.findPackageJson());
                    return [4 /*yield*/, jk_fs.isFile(jk_fs.join(rootDir, "global.css"))];
                case 4:
                    if (_a.sent()) {
                        return [2 /*return*/, jk_fs.readTextFromFile(jk_fs.join(rootDir, "global.css"))];
                    }
                    return [2 /*return*/, "@import \"tailwindcss\";"];
            }
        });
    });
}
/**
 * Get Tailwind template CSS file from Shadcn config file (components.json).
 * See: https://ui.shadcn.com/docs/components-json
 */
function getTailwindTemplateFromShadCnConfig() {
    return __awaiter(this, void 0, void 0, function () {
        var pkgJsonPath, filePath, asText, asJSON, tailwindConfig, tailwindCssTemplate, fullPath;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    pkgJsonPath = jk_app.findPackageJson();
                    if (!pkgJsonPath)
                        return [2 /*return*/, undefined];
                    filePath = path.join(path.dirname(pkgJsonPath), "components.json");
                    return [4 /*yield*/, jk_fs.isFile(filePath)];
                case 1:
                    if (!(_a.sent()))
                        return [2 /*return*/, undefined];
                    try {
                        asText = jk_fs.readTextSyncFromFile(filePath);
                        asJSON = JSON.parse(asText);
                        tailwindConfig = asJSON.tailwind;
                        if (!tailwindConfig)
                            return [2 /*return*/, undefined];
                        tailwindCssTemplate = tailwindConfig.css;
                        if (!tailwindCssTemplate)
                            return [2 /*return*/, undefined];
                        fullPath = path.resolve(path.dirname(pkgJsonPath), tailwindCssTemplate);
                        return [2 /*return*/, jk_fs.readTextSyncFromFile(fullPath)];
                    }
                    catch (e) {
                        console.error("Error reading Shadcn config file:", e);
                        return [2 /*return*/, undefined];
                    }
                    return [2 /*return*/];
            }
        });
    });
}
