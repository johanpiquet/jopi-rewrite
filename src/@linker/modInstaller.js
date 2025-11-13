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
import { FilePart, InstallFileType, ModuleDirProcessor, resolveFile } from "./engine.ts";
/**
 * Search the uiInstall.ts and serverInstall.ts files
 */
var ModInstaller = /** @class */ (function (_super) {
    __extends(ModInstaller, _super);
    function ModInstaller() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.uiInitFiles = [];
        _this.serverInitFiles = [];
        return _this;
    }
    ModInstaller.prototype.onBeginModuleProcessing = function (_writer, moduleDir) {
        return __awaiter(this, void 0, void 0, function () {
            var uiInitFile, serverInitFile;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, resolveFile(moduleDir, ["uiInit.tsx", "uiInit.ts"])];
                    case 1:
                        uiInitFile = _a.sent();
                        if (uiInitFile)
                            this.uiInitFiles.push(uiInitFile);
                        return [4 /*yield*/, resolveFile(moduleDir, ["serverInit.tsx", "serverInit.ts"])];
                    case 2:
                        serverInitFile = _a.sent();
                        if (serverInitFile)
                            this.serverInitFiles.push(serverInitFile);
                        return [2 /*return*/];
                }
            });
        });
    };
    ModInstaller.prototype.generateCode = function (writer) {
        return __awaiter(this, void 0, void 0, function () {
            var i, _i, _a, uiInitFile, relPath, _b, _c, serverInitFile, relPath;
            return __generator(this, function (_d) {
                i = 0;
                for (_i = 0, _a = this.uiInitFiles; _i < _a.length; _i++) {
                    uiInitFile = _a[_i];
                    i++;
                    relPath = writer.makePathRelatifToOutput(uiInitFile);
                    if (!writer.isTypeScriptOnly)
                        relPath = writer.toJavascriptFileName(relPath);
                    writer.genAddToInstallFile(InstallFileType.browser, FilePart.imports, "\nimport modUiInit".concat(i, " from \"").concat(relPath, "\";"));
                    writer.genAddToInstallFile(InstallFileType.browser, FilePart.footer, "\n    modUiInit".concat(i, "(registry);"));
                }
                i = 0;
                for (_b = 0, _c = this.serverInitFiles; _b < _c.length; _b++) {
                    serverInitFile = _c[_b];
                    i++;
                    relPath = writer.makePathRelatifToOutput(serverInitFile);
                    if (!writer.isTypeScriptOnly)
                        relPath = writer.toJavascriptFileName(relPath);
                    writer.genAddToInstallFile(InstallFileType.server, FilePart.imports, "\nimport modServerInit".concat(i, " from \"").concat(relPath, "\";"));
                    writer.genAddToInstallFile(InstallFileType.server, FilePart.body, "\n    await modServerInit".concat(i, "(registry);"));
                }
                return [2 /*return*/];
            });
        });
    };
    return ModInstaller;
}(ModuleDirProcessor));
export default ModInstaller;
