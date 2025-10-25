import * as jk_fs from "jopi-toolkit/jk_fs";
import {getBrowserInstallScript, getServerInstallScript} from "./engine.ts";

export type InstallFunction<T> = (registry: T) => void;

export async function loadServerInstall<T>(value: T) {
    let installFilePath = getServerInstallScript();
    if (!await jk_fs.isFile(installFilePath)) return;

    try {
        let v = await import(installFilePath);
        if (!v.default) return;

        await v.default(value);
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