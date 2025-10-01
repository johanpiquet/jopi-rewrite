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

    currentModuleInitializer?: ModuleInitializer;

    getCurrentModuleInitializer(): ModuleInitializer {
        return this.currentModuleInitializer!;
    }

    async initializeModules() {
        for (const moduleDirPath of this.allModuleDir) {
            await this.initModule(moduleDirPath);
        }
    }

    private async initModule(moduleDirPath: string) {
        let currentModuleInfo: ModuleInfoWithPath = {
            moduleDir: moduleDirPath,
            moduleName: nFS.basename(moduleDirPath)
        };

        let moduleInitializer = new ModuleInitializer(currentModuleInfo);

        let file = nApp.getCompiledFilePathFor(path.join(moduleDirPath, "serverInit.tsx"));

        if (await nFS.isFile(file)) {
            gCurrentModuleManager = this;
            this.currentModuleInitializer = moduleInitializer;

            await import(file);

            this.allModuleInfo.push(currentModuleInfo);
            gCurrentModuleManager = undefined;
            this.currentModuleInitializer = undefined;
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

class ModuleInitializer {
    constructor(private readonly moduleInfo: ModuleInfoWithPath) {
    }

    setModuleInfo(moduleInfo: ModuleInfo) {
        if (moduleInfo.moduleName) {
            this.moduleInfo.moduleName = moduleInfo.moduleName;
        }

        if (moduleInfo.moduleTitle) {
            this.moduleInfo.moduleTitle = moduleInfo.moduleTitle;
        }
    }
}

interface ModuleInfoWithPath extends ModuleInfo {
    moduleDir: string;
}

export function getModuleServerInitContent(): ModuleInitializer {
    return gCurrentModuleManager!.getCurrentModuleInitializer();
}

let gCurrentModuleManager: ModulesManager | undefined;