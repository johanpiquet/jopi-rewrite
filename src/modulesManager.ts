import path from "node:path";
import NodeSpace from "jopi-node-space";
import type {WebSite} from "./jopiWebSite.js";
import React from "react";
import {getCompiledFilePathFor} from "jopi-node-space/dist/_app.js";

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

    getModulesInfos(): ModuleInfoWithPath[] {
        return this.allModuleInfo;
    }

    async initializeModules() {
        for (const moduleDirPath of this.allModuleDir) {
            await this.initModule(moduleDirPath);
        }
    }

    private async initModule(moduleDirPath: string) {
        let file = path.join(moduleDirPath, "jopiGetModuleInfo.tsx");
        file = nApp.getCompiledFilePathFor(file);

        let currentModuleInfo: ModuleInfoWithPath = {
            moduleDir: moduleDirPath,
            moduleName: nFS.basename(moduleDirPath)
        };

        if (await nFS.isFile(file)) {
            gCurrentModuleInfo = undefined;
            gCurrentModuleManager = this;

            await import(file);

            const cmi = gCurrentModuleInfo!;

            if (cmi) {
                let newModuleInfo = {...cmi, moduleDir: moduleDirPath};
                if (!newModuleInfo.moduleName) newModuleInfo.moduleName = currentModuleInfo.moduleName;
                if (!newModuleInfo.moduleTitle) newModuleInfo.moduleTitle = currentModuleInfo.moduleTitle;
                currentModuleInfo = newModuleInfo;

                this.allModuleInfo.push(currentModuleInfo);
                gCurrentModuleManager = undefined;
            }

            gCurrentModuleInfo = undefined;
        }

        file = nApp.getCompiledFilePathFor(path.join(moduleDirPath, "serverInit.tsx"));

        if (await nFS.isFile(file)) {
            await import(file);
        }

        file = nApp.getCompiledFilePathFor(path.join(moduleDirPath, "uiInit.tsx"));

        if (await nFS.isFile(file)) {
            addUiInitFile(file);
        }

        let dirPath = path.join(moduleDirPath, "routes");

        if (await nFS.isDirectory(dirPath)) {
            await this.webSite.getReactRouterManager().scanRoutesFrom(dirPath);
        }

        dirPath = path.join(moduleDirPath, "public");

        if (await nFS.isDirectory(dirPath)) {
            await this.processPublicDir(dirPath);
        }

        dirPath = path.join(moduleDirPath, "uiComposites");

        if (await nFS.isDirectory(dirPath)) {
            await this.processCompositesDir(dirPath, currentModuleInfo);
        }
    }

    private async processPublicDir(dirPath: string) {
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

    private async processCompositesDir(dirPath: string, module: ModuleInfoWithPath) {
        const dirItems = await nFS.listDir(dirPath);

        for (let dirItem of dirItems) {
            if (!dirItem.isDirectory) continue;
            if (dirItem.name[0]===".") continue;

            let compositeName = dirItem.name;

            let subDirItems = await nFS.listDir(dirItem.fullPath);

            for (let subDirItem of subDirItems) {
                if (subDirItem.isDirectory) continue;
                if (!subDirItem.name.endsWith(".extension.tsx")) continue;

                let extensionName = subDirItem.name.slice(0, -14);
                console.log(`Adding extension point ${extensionName}[${module.moduleName}] to ${compositeName}`);

                await addUiComposite(compositeName, extensionName, subDirItem.fullPath);
            }
        }
    }
}

interface CompositeItem {
    filePath: string;
    extensionName: string;
    Component: React.FunctionComponent<any>;
}

const gAllComposites: Record<string, CompositeItem[]> = {};

const gUiInitFiles: string[] = [];

function addUiInitFile(file: string) {
    gUiInitFiles.push(file);
}

export function getUiInitFiles(): string[] {
    return gUiInitFiles;
}

async function addUiComposite(compositeName: string, extensionName: string, implFilePath: string) {
    const distFilePath = getCompiledFilePathFor(implFilePath);

    let composite = gAllComposites[compositeName];
    if (!composite) gAllComposites[compositeName] = composite = [];

    try {
        const c = await import(distFilePath);
        composite.push({extensionName, filePath: distFilePath, Component: c.default as React.FunctionComponent<any>});
    }
    catch (e) {
        console.error(`Can't load component for composite '${compositeName}'. File:  ${implFilePath}`);
        throw e;
    }
}

export function getUiCompositeItems(compositeName: string): CompositeItem[] {
    return gAllComposites[compositeName] || [];
}

export function getAllUiComposites(): Record<string, CompositeItem[]> {
    return gAllComposites;
}

export interface ModuleInfo {
    moduleName?: string;
    moduleTitle?: string;
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