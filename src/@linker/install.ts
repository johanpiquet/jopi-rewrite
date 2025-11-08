import * as jk_fs from "jopi-toolkit/jk_fs";
import * as jk_events from "jopi-toolkit/jk_events";
import type {WebSite} from "jopi-rewrite";
import {getBrowserInstallScript, getServerInstallScript} from "./engine.ts";

export type InstallFunction<T> = (registry: T) => void;

export async function loadServerInstall(webSite: WebSite) {
    let installFilePath = getServerInstallScript();
    if (!await jk_fs.isFile(installFilePath)) return;

    try {
        let v = await import(installFilePath);
        if (!v.default) return;

        await v.default(webSite);
        jk_events.sendEvent("jopi.server.install.done", webSite);
    }
    catch (error) {
        throw error;
    }
}

export async function getBrowserInstallFunction<T>(): Promise<InstallFunction<T>> {
    let installFilePath = getBrowserInstallScript();
    if (!await jk_fs.isFile(installFilePath)) return gVoidFunction;

    let v = await import(installFilePath);
    if (!v.default) return gVoidFunction;

    return function(registry: T) {
        v.default(registry);
    }
}

const gVoidFunction = () => {};