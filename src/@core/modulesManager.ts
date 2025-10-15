import path from "node:path";
import * as ns_app from "jopi-node-space/ns_app";
import * as ns_events from "jopi-node-space/ns_events";
import * as ns_fs from "jopi-node-space/ns_fs";
import {type WebSite, WebSiteImpl} from "./jopiWebSite.ts";
import React from "react";

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

        ns_events.sendEvent("app.init.server");
    }

    addInitializer(priority: ns_events.EventPriority, initializer: ()=>Promise<void>) {
        ns_events.addListener("app.init.server", priority, initializer);
    }

    private async initModule(moduleDirPath: string) {
        let currentModuleInfo: ModuleInfoWithPath = {
            moduleDir: moduleDirPath,
            moduleName: ns_fs.basename(moduleDirPath)
        };

        let file = ns_app.getCompiledFilePathFor(path.join(moduleDirPath, "serverInit.tsx"));

        if (await ns_fs.isFile(file)) {
            const exportDefault = (await import(file)).default;

            if (exportDefault && typeof exportDefault === "function") {
                let res = exportDefault(new ModuleInitContext_Server(this, currentModuleInfo));
                if (res instanceof Promise) await res;
            }

            this.allModuleInfo.push(currentModuleInfo);
        }

        file = ns_app.getCompiledFilePathFor(path.join(moduleDirPath, "uiInit.tsx"));

        if (await ns_fs.isFile(file)) {
            // > Do the UI init on the server-side.
            //   Require because the server is also a UI generator.

            const exportDefault = (await import(file)).default;

            if (exportDefault && typeof exportDefault === "function") {
                // Will allows an init inside the browser.
                gUiInitFiles.push(ns_app.getSourcesCodePathFor(file));

                (this.webSite as WebSiteImpl).addUiModule(exportDefault);
            }
        }

        let dirPath = path.join(moduleDirPath, "routes");

        if (await ns_fs.isDirectory(dirPath)) {
            await this.webSite.getReactRouterManager().scanRoutesFrom(dirPath);
        }

        dirPath = path.join(moduleDirPath, "public");

        if (await ns_fs.isDirectory(dirPath)) {
            await this.processPublicDir(dirPath);
        }

        dirPath = path.join(moduleDirPath, "uiComposites");

        if (await ns_fs.isDirectory(dirPath)) {
            await this.processCompositesDir(dirPath, currentModuleInfo);
        }
    }

    private async processPublicDir(dirPath: string) {
        const addDir = async (dirPath: string, route: string) => {
            const dirItems = await ns_fs.listDir(dirPath);

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
        const dirItems = await ns_fs.listDir(dirPath);

        for (let dirItem of dirItems) {
            if (!dirItem.isDirectory) continue;
            if (dirItem.name[0]===".") continue;

            let compositeName = dirItem.name;

            let subDirItems = await ns_fs.listDir(dirItem.fullPath);

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

    addServerInitializer(priority: ns_events.EventPriority, initializer: ()=>Promise<void>) {
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

/**
 * Add a script which will be loaded once the UI start.
 * Warning: this file is not executed on the server side.
 * It's mainly used to hook the default behaviors.
 */
export function addGlobalUiInitFile(filePath: string) {
    gGlobalUiInitFiles.push(filePath);
}

export function getGlobalUiInitFiles(): string[] {
    return gGlobalUiInitFiles;
}

const gGlobalUiInitFiles: string[] = [];

//endregion

//region UI Composite

interface UiCompositeItem {
    filePath: string;
    extensionName: string;
    Component: React.FunctionComponent<any>;
}

const gAllComposites: Record<string, UiCompositeItem[]> = {};

async function addUiComposite(compositeName: string, extensionName: string, implFilePath: string) {
    const distFilePath = ns_app.getCompiledFilePathFor(implFilePath);

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
