import {type ArobaseList, Type_ArobaseList} from "./arobaseTypes.ts";
import {CodeGenWriter, FilePart, InstallFileType, type RegistryItem} from "./engine.ts";

export default class TypeEvents extends Type_ArobaseList {
    async endGeneratingCode(writer: CodeGenWriter, items: RegistryItem[]): Promise<void> {
        let count = 0;

        for (let item of items) {
            count++;

            let installFileType: InstallFileType;
            let list = item as ArobaseList;

            let conditions = list.conditions;

            if (conditions) {
                if (conditions.has("server") && conditions.has("browser")) installFileType = InstallFileType.both;
                else if (conditions.has("server")) installFileType = InstallFileType.server;
                else if (conditions.has("browser")) installFileType = InstallFileType.browser;
                else installFileType = InstallFileType.both;
            } else {
                installFileType = InstallFileType.both;
            }

            let jsSources = `    registry.events.addProvider("${list.listName}", async () => { const R = await import("@/events/${list.listName}"); return R.default; });`;
            writer.genAddToInstallFile(installFileType, FilePart.body, jsSources);
        }
    }
}