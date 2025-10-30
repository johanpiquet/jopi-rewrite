import {
    CodeGenWriter,
    FilePart,
    InstallFileType,
    ModuleDirProcessor,
    resolveFile
} from "./engine.ts";
import * as jk_fs from "jopi-toolkit/jk_fs";

export class ModulesInitProcessor extends ModuleDirProcessor {
    private uiInitFiles: string[] = [];
    private serverInitFiles: string[] = [];
    private routesDir?: string;

    override async onBeginModuleProcessing(_writer: CodeGenWriter, moduleDir: string): Promise<void> {
        let uiInitFile = await resolveFile(moduleDir, ["uiInit.tsx", "uiInit.ts"]);
        if (uiInitFile) this.uiInitFiles.push(uiInitFile);

        let serverInitFile = await resolveFile(moduleDir, ["serverInit.tsx", "serverInit.ts"]);
        if (serverInitFile) this.serverInitFiles.push(serverInitFile);

        let routesDir = jk_fs.join(moduleDir, "routes");
        if (await jk_fs.isDirectory(routesDir)) this.routesDir = routesDir;
    }

    override async generateCode(writer: CodeGenWriter): Promise<void> {
        let i = 0;

        for (let uiInitFile of this.uiInitFiles) {
            i++;

            let relPath = writer.makePathRelatifToOutput(uiInitFile);
            if (!writer.isTypeScriptOnly) relPath = writer.toJavascriptFileName(relPath);

            writer.genAddToInstallFile(InstallFileType.browser, FilePart.imports, `\nimport modUiInit${i} from "${relPath}";`);
            writer.genAddToInstallFile(InstallFileType.browser, FilePart.footer, `\n    modUiInit${i}(registry);`)
        }

        i = 0;

        for (let serverInitFile of this.serverInitFiles) {
            i++;

            let relPath = writer.makePathRelatifToOutput(serverInitFile);
            if (!writer.isTypeScriptOnly) relPath = writer.toJavascriptFileName(relPath);

            writer.genAddToInstallFile(InstallFileType.server, FilePart.imports, `\nimport modServerInit${i} from "${relPath}";`);
            writer.genAddToInstallFile(InstallFileType.server, FilePart.body, `\n    await modServerInit${i}(registry);`)
        }

        if (this.routesDir) {
            writer.genAddToInstallFile(InstallFileType.server, FilePart.body, `\n    await registry.getRoutesManager().scanRoutesFrom("${this.routesDir}");`);
        }
    }
}