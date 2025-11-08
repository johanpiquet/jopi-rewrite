import {type ArobaseList, Type_ArobaseList} from "./arobaseTypes.ts";
import {CodeGenWriter, FilePart, InstallFileType, type RegistryItem} from "./engine.ts";

export default class TypeEvents extends Type_ArobaseList {
    async endGeneratingCode(writer: CodeGenWriter, items: RegistryItem[]): Promise<void> {
        let count = 0;

        // Here items are individual event listeners.
        // There are not sorted, an item can be bound to an event A and another item to another event.
        //
        for (let item of items) {
            count++;

            let installFileType: InstallFileType;
            let list = item as ArobaseList;
            let conditions = list.conditions;

            if (conditions) {
                if (conditions.has("if_server") && conditions.has("if_browser")) installFileType = InstallFileType.both;
                else if (conditions.has("if_server")) installFileType = InstallFileType.server;
                else if (conditions.has("if_browser")) installFileType = InstallFileType.browser;
                else installFileType = InstallFileType.both;
            } else {
                installFileType = InstallFileType.both;
            }

            let jsSources = `    registry.events.addProvider("${list.listName}", async () => { const R = await import("@/events/${list.listName}"); return R.list; });`;
            writer.genAddToInstallFile(installFileType, FilePart.body, jsSources);
        }
    }

    protected codeGen_generateExports(array: string, eventName: string) {
        return `export const list = ${array};
export const event = getEvent(${JSON.stringify(eventName)});
export default event;`;
    }

    protected codeGen_generateImports() {
        return `import {getEvent} from "jopi-toolkit/jk_events";\n`;
    }

    protected normalizeConditionName(condName: string): string|undefined {
        if (condName.startsWith("if")) {
            condName = condName.substring(2);
        }

        condName = condName.replace("-", "");
        condName = condName.replace("_", "");

        if (condName==="browser") {
            return  "if_browser";
        }
        else if (condName==="server") {
            return "if_server";
        }

        return undefined;
    }
}