import * as jk_fs from "jopi-toolkit/jk_fs";
import {ArobaseType} from "./engine.ts";

export default class TypeReplaces extends ArobaseType {
    async processDir(p: { moduleDir: string; arobaseDir: string; genDir: string; }): Promise<void> {
        let itemTypes = await jk_fs.listDir(p.arobaseDir);

        for (let itemType of itemTypes) {
            if ((itemType.name[0]==='_') || (itemType.name[0]==='.')) continue;

            await this.rules_applyRulesOnDir({
                dirToScan: itemType.fullPath,
                expectFsType: "dir",

                itemDefRules: {
                    nameConstraint: "canBeUid",
                    requireRefFile: true,

                    rootDirName: itemType.name,

                    transform: async (props) => {
                        const itemToReplace = props.itemName;
                        let mustReplaceWith = props.refTarget!;

                        let idx = itemToReplace.indexOf("!");
                        if (idx===-1) throw this.declareError("The type is missing in the name. Should be 'type!elementId'", props.itemPath);

                        let type = itemToReplace.substring(0, idx);
                        idx = mustReplaceWith.indexOf("!");

                        if (!idx) {
                            mustReplaceWith = type + "!" + mustReplaceWith;
                        }
                        else {
                            let type2 = mustReplaceWith.substring(0, idx);
                            if (type!==type2) {
                                let expected = type2 + mustReplaceWith.substring(idx);
                                throw this.declareError(`Type mismatch. Must be ${expected}`, props.itemPath);
                            }
                        }

                        this.registry_addReplaceRule(itemToReplace, mustReplaceWith, props.priority, props.itemPath);
                    }
                }
            });
        }
    }
}