import path from "node:path";
import NodeSpace from "jopi-node-space";
import type {WebSite} from "./jopiWebSite.js";

const nFS = NodeSpace.fs;
const nApp = NodeSpace.app;

export class ModulesManager {
    private readonly allModuleDir: string[] = [];
    private readonly allModuleInfo: ModuleInfoWithPath[] = [];

    constructor(public readonly webSite: WebSite) {
    }

    addModules(modulesDir: string, moduleNames: string[]) {
        for (const moduleName of moduleNames) {
            this.addModule(path.join(modulesDir, moduleName));
        }
    }

    addModule(moduleDirPath: string) {
        this.allModuleDir.push(moduleDirPath);
    }

    async initializeModules() {
        for (const moduleDirPath of this.allModuleDir) {
            await this.initModule(moduleDirPath);
        }
    }

    private async initModule(moduleDirPath: string) {
        let file = path.join(moduleDirPath, "jopiGetModuleInfo.tsx");
        file = nApp.getCompiledFilePathFor(file);

        if (await nFS.isFile(file)) {
            gCurrentModuleInfo = undefined;
            gCurrentModuleManager = this;

            await import(file);

            const cmi = gCurrentModuleInfo!;

            if (cmi) {
                this.allModuleInfo.push({
                    ...cmi,
                    moduleDir: moduleDirPath
                });

                gCurrentModuleManager = undefined;
            }

            gCurrentModuleInfo = undefined;
        }

        file = path.join(moduleDirPath, "jopiInitModule.tsx");
        file = nApp.getCompiledFilePathFor(file);

        if (await nFS.isFile(file)) {
            await import(file);
        }

        let dirPath = path.join(moduleDirPath, "routes");

        if (await nFS.isDirectory(dirPath)) {
            await this.webSite.getReactRouterManager().scanRoutesFrom(dirPath);
        }

        dirPath = path.join(moduleDirPath, "public");

        if (await nFS.isDirectory(dirPath)) {
            await this.addPublicDir(dirPath);
        }
    }

    async addPublicDir(dirPath: string) {
        const addDir = async (dirPath: string, route: string) => {
            const dirItems = await nFS.listDir(dirPath);

            for (const dirItem of dirItems) {
                if (dirItem.name[0]===".") continue;
                let thisRoute = route + '/' + dirItem.name;

                if (dirItem.isDirectory) {
                    await addDir(dirItem.fullPath, thisRoute);
                } else if (dirItem.isFile) {
                    this.webSite.onGET(thisRoute, async req => {
                        return req.returnFile(dirItem.fullPath)
                    });
                }
            }
        }

        await addDir(dirPath, "");
    }
}

export interface ModuleInfo {
    moduleTitle: string;
}

interface ModuleInfoWithPath extends ModuleInfo {
    moduleDir: string;
}

export function setCurrentModuleInfo(infos: ModuleInfo) {
    gCurrentModuleInfo = infos;
}

export function getCurrentModuleManager() {
    return gCurrentModuleManager;
}

let gCurrentModuleInfo: ModuleInfo | undefined;
let gCurrentModuleManager: ModulesManager | undefined;