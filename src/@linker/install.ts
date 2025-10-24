import * as jk_fs from "jopi-toolkit/jk_fs";
import {getProjectGenDir} from "./engine.ts";
import * as jk_app from "jopi-toolkit/jk_app";

export async function loadServerInstall<T>(value: T) {
    let genDir = getProjectGenDir();
    let installFilePath = jk_fs.join(genDir, "installServer.ts");
    if (!await jk_fs.isFile(installFilePath)) return;

    installFilePath = jk_app.getCompiledFilePathFor(installFilePath);
    if (!installFilePath) return;

    let v = await import(installFilePath);
    if (!v.default) return;

    await v.default(value);
}

export type InstallFunction<T> = (registry: T) => void;

export async function getBrowserInstallFunction<T>(): Promise<InstallFunction<T>> {
    let installFilePath = getBrowserInstallScript();
    if (!await jk_fs.isFile(installFilePath)) return gVoidFunction;

    installFilePath = jk_app.getCompiledFilePathFor(installFilePath);
    if (!installFilePath) return gVoidFunction;

    let v = await import(installFilePath);
    if (!v.default) return gVoidFunction;

    return function(registry: T) {
        v.default(registry);
    }
}

export function getBrowserInstallScript(): string {
    let genDir = getProjectGenDir();
    return jk_fs.join(genDir, "installBrowser.ts");
}

const gVoidFunction = () => {};