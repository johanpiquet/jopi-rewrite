import {
    FilePart,
    genAddToInstallFile,
    getProjectGenDir,
    InstallFileType,
    ModuleDirProcessor,
    resolve
} from "./engine.ts";
import * as jk_fs from "jopi-toolkit/jk_fs";

export class ModulesInitProcessor extends ModuleDirProcessor {
    private uiInitFiles: string[] = [];
    private serverInitFiles: string[] = [];

    override async onBeginModuleProcessing(moduleDir: string): Promise<void> {
        let uiInitFile = await resolve(moduleDir, ["uiInit.tsx", "uiInit.ts"]);
        if (uiInitFile) this.uiInitFiles.push(uiInitFile);

        let serverInitFile = await resolve(moduleDir, ["serverInit.tsx", "serverInit.ts"]);
        if (serverInitFile) this.serverInitFiles.push(serverInitFile);
    }

    override generateCode(): Promise<void> {
        let i = 0;

        const genDir = getProjectGenDir();

        for (let uiInitFile of this.uiInitFiles) {
            i++;

            let relPath = jk_fs.getRelativePath(genDir, uiInitFile);
            genAddToInstallFile(InstallFileType.browser, FilePart.imports, `import modUiInit${i} from "${relPath}";`);
            genAddToInstallFile(InstallFileType.browser, FilePart.footer, `// @ts-ignore\nmodUiInit${i}(registry);`)
        }

        i = 0;

        for (let serverInitFile of this.serverInitFiles) {
            i++;

            let relPath = jk_fs.getRelativePath(genDir, serverInitFile);
            genAddToInstallFile(InstallFileType.server, FilePart.imports, `import modServerInit${i} from "${relPath}";`);
            genAddToInstallFile(InstallFileType.server, FilePart.footer, `// @ts-ignore\nmodServerInit${i}(registry);`)
        }

        return Promise.resolve();
    }
}