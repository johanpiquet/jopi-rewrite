import * as jk_fs from "jopi-toolkit/jk_fs";
import {applyTypeRulesOnDir, addReplace, ArobaseType, declareError} from "./engine.ts";

export default class TypeReplaces extends ArobaseType {
    async processDir(p: { moduleDir: string; arobaseDir: string; genDir: string; }): Promise<void> {
        let itemTypes = await jk_fs.listDir(p.arobaseDir);

        for (let itemType of itemTypes) {
            if ((itemType.name[0]==='_') || (itemType.name[0]==='.')) continue;

            await applyTypeRulesOnDir({
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
                        if (idx===-1) throw declareError("The type is missing in the name. Should be 'type!elementId'", props.itemPath);

                        let type = itemToReplace.substring(0, idx);
                        idx = mustReplaceWith.indexOf("!");

                        if (!idx) {
                            mustReplaceWith = type + "!" + mustReplaceWith;
                        }
                        else {
                            let type2 = mustReplaceWith.substring(0, idx);
                            if (type!==type2) {
                                let expected = type2 + mustReplaceWith.substring(idx);
                                throw declareError(`Type mismatch. Must be ${expected}`, props.itemPath);
                            }
                        }

                        addReplace(itemToReplace, mustReplaceWith, props.priority, props.itemPath);
                    }
                }
            });
        }
    }
}