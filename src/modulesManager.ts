import path from "node:path";
import NodeSpace from "jopi-node-space";

const nFS = NodeSpace.fs;
const nApp = NodeSpace.app;

export class ModulesManager {
    private readonly allModuleDir: string[] = [];
    private readonly allModuleInfo: ModuleInfoWithPath[] = [];

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
        file = nApp.getCompiledSourcesFor(file);

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
        file = nApp.getCompiledSourcesFor(file);

        if (await nFS.isFile(file)) {
            await import(file);
        }
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