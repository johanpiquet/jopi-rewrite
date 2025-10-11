import path from "node:path";
import NodeSpace, {EventPriority} from "jopi-node-space";
import {type WebSite, WebSiteImpl} from "./jopiWebSite.js";
import React from "react";

const nFS = NodeSpace.fs;
const nApp = NodeSpace.app;
const nEvents = NodeSpace.events;

//region ModuleManager

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

        nEvents.sendEvent("app.init.server");
    }

    addInitializer(priority: EventPriority, initializer: ()=>Promise<void>) {
        nEvents.addListener("app.init.server", priority, initializer);
    }

    private async initModule(moduleDirPath: string) {
        let currentModuleInfo: ModuleInfoWithPath = {
            moduleDir: moduleDirPath,
            moduleName: nFS.basename(moduleDirPath)
        };

        let file = nApp.getCompiledFilePathFor(path.join(moduleDirPath, "serverInit.tsx"));

        if (await nFS.isFile(file)) {
            const exportDefault = (await import(file)).default;

            if (exportDefault && typeof exportDefault === "function") {
                let res = exportDefault(new ModuleInitContext_Server(this, currentModuleInfo));
                if (res instanceof Promise) await res;
            }

            this.allModuleInfo.push(currentModuleInfo);
        }

        file = nApp.getCompiledFilePathFor(path.join(moduleDirPath, "uiInit.tsx"));

        if (await nFS.isFile(file)) {
            // > Do the UI init on the server-side.
            //   Require because the server is also a UI generator.

            const exportDefault = (await import(file)).default;

            if (exportDefault && typeof exportDefault === "function") {
                // Will allows an init inside the browser.
                gUiInitFiles.push(nApp.getSourcesCodePathFor(file));

                (this.webSite as WebSiteImpl).addPageRenderInitializer(exportDefault);
            }
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
                //console.log(`Adding extension point ${extensionName}[${module.moduleName}] to ${compositeName}`);

                await addUiComposite(compositeName, extensionName, subDirItem.fullPath);
            }
        }
    }
}

export class ModuleInitContext_Server {
    constructor(private readonly modulesManager: ModulesManager, private readonly moduleInfo: ModuleInfoWithPath) {
    }

    setModuleInfo(moduleInfo: ModuleInfo) {
        if (moduleInfo.moduleName) {
            this.moduleInfo.moduleName = moduleInfo.moduleName;
        }

        if (moduleInfo.moduleTitle) {
            this.moduleInfo.moduleTitle = moduleInfo.moduleTitle;
        }
    }

    addServerInitializer(priority: EventPriority, initializer: ()=>Promise<void>) {
        this.modulesManager.addInitializer(priority, initializer);
    }
}

export interface ModuleInfo {
    moduleName?: string;
    moduleTitle?: string;
}

interface ModuleInfoWithPath extends ModuleInfo {
    moduleDir: string;
}

//endregion

//region UI initialization files

const gUiInitFiles: string[] = [];

export function getUiInitFiles(): string[] {
    return gUiInitFiles;
}

//endregion

//region UI Composite

interface UiCompositeItem {
    filePath: string;
    extensionName: string;
    Component: React.FunctionComponent<any>;
}

const gAllComposites: Record<string, UiCompositeItem[]> = {};

async function addUiComposite(compositeName: string, extensionName: string, implFilePath: string) {
    const distFilePath = nApp.getCompiledFilePathFor(implFilePath);

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

export function getUiCompositeItems(compositeName: string): UiCompositeItem[] {
    return gAllComposites[compositeName] || [];
}

export function getAllUiComposites(): Record<string, UiCompositeItem[]> {
    return gAllComposites;
}

//endregion
