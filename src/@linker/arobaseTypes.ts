import * as jk_fs from "jopi-toolkit/jk_fs";

import {
    addToRegistry,
    type TypeRules_CollectionItem,
    declareError, genWriteFile, getRegistryItem,
    getSortedDirItem,
    type TransformParams, PriorityLevel, type RegistryItem, requireRegistryItem, applyTypeRulesOnChildDir,
    applyTypeRulesOnDir, mustSkip_expectDir, ArobaseType, type RulesFor_Collection, createDirSymlink
} from "./engine.ts";

// region ArobaseList

export interface ArobaseList extends RegistryItem {
    listName: string;
    allDirPath: string[];
    items: ArobaseListItem[];
    itemsType: string;
    conditions?: Set<string>;
}

export interface ArobaseListItem {
    ref?: string;
    entryPoint?: string;
    priority: PriorityLevel;
    sortKey: string;
}

export class Type_ArobaseList extends ArobaseType {
    processDir(p: { moduleDir: string; arobaseDir: string; genDir: string; }) {
        return this.processList(p.arobaseDir);
    }

    protected async processList(listDirPath: string) {
        await applyTypeRulesOnDir(this.hookRootDirConstraints({
            dirToScan: listDirPath,
            expectFsType: "dir",

            itemDefRules: {
                nameConstraint: "canBeUid",
                requireRefFile: false,
                requirePriority: true,
                rootDirName: jk_fs.basename(listDirPath),
                transform: (p) => this.processListItem(p)
            }
        }));
    }

    async processListItem(p: TransformParams) {
        let listId = this.typeName + "!" + p.itemName!;
        const listName = p.itemName;

        // > Extract the list items.

        const dirItems = await getSortedDirItem(p.itemPath);
        let listItems: ArobaseListItem[] = [];

        const params: TypeRules_CollectionItem = {
            rootDirName: p.parentDirName,
            nameConstraint: "mustNotBeUid",
            requirePriority: true,

            filesToResolve: {
                "entryPoint": ["index.tsx", "index.ts"]
            },

            transform: async (item) => {
                if (item.refTarget && item.resolved.entryPoint) {
                    throw declareError("The list item can't have both an index file and a .ref file", item.itemPath);
                }

                listItems.push({
                    priority: item.priority,
                    sortKey: item.itemName,
                    ref: item.refTarget,
                    entryPoint: item.resolved.entryPoint
                });
            }
        };

        for (let dirItem of dirItems) {
            if (await mustSkip_expectDir(dirItem)) continue;
            await applyTypeRulesOnChildDir(params, dirItem);
        }

        // > Add the list.

        let current = getRegistryItem<ArobaseList>(listId, this);

        if (!current) {
            const newItem: ArobaseList = {
                listName, conditions: p.conditions,
                arobaseType: this, itemPath: p.itemPath,
                items: listItems, itemsType: p.parentDirName, allDirPath: [p.itemPath]
            };

            addToRegistry(listId, newItem);
            return;
        } else {
            if (p.conditions) {
                if (current.conditions) {
                    for (let c of p.conditions) {
                        current.conditions.add(c);
                    }
                } else {
                    if (!current.conditions) {
                        current.conditions = p.conditions;
                    }
                }
            }
        }

        if (current.itemsType !== p.parentDirName) {
            throw declareError(`The list ${listId} is already defined and has a different type: ${current.itemsType}`, p.itemPath);
        }

        current.allDirPath.push(p.itemPath);
        current.items.push(...listItems);
    }

    hookRootDirConstraints(p: RulesFor_Collection): RulesFor_Collection {
        return p;
    }

    protected getGenOutputDir(genDir: string, list: ArobaseList) {
        return jk_fs.join(genDir, this.typeName);
    }

    async generateCodeForItem(key: string, rItem: RegistryItem, infos: { genDir: string; }) {
        function sortByPriority(items: ArobaseListItem[]): ArobaseListItem[] {
            function addPriority(priority: PriorityLevel) {
                let e = byPriority[priority];
                if (e) items.push(...e);
            }

            const byPriority: any = {};

            for (let item of items) {
                if (!byPriority[item.priority]) byPriority[item.priority] = [];
                byPriority[item.priority].push(item);
            }

            items = [];

            addPriority(PriorityLevel.veryHigh);
            addPriority(PriorityLevel.high);
            addPriority(PriorityLevel.default);
            addPriority(PriorityLevel.low);
            addPriority(PriorityLevel.veryLow);

            return items;
        }

        const list = rItem as ArobaseList;
        list.items = sortByPriority(list.items);

        await this.generateCodeForList(key, list, infos.genDir);
    }

    protected resolveEntryPointFor(list: ArobaseList, item: ArobaseListItem, outDir: string): string {
        let entryPoint = item.entryPoint!;

        if (!entryPoint) {
            let d = requireRegistryItem<ArobaseChunk>(item.ref!);
            if (d.itemType!==list.itemsType) {
                throw declareError(`Type mismatch. Expect ${list.itemsType}`, d.itemPath)
            }

            if (!d.entryPoint) {
                throw declareError(`Item if missing index.ts/index.tsx file`, d.itemPath)
            }

            entryPoint = d.entryPoint;
        }

        return jk_fs.getRelativePath(outDir, entryPoint);
    }

    protected async generateCodeForList(key: string, list: ArobaseList, genDir: string): Promise<void> {
        let source = "";
        let count = 1;

        let outDir = this.getGenOutputDir(genDir, list);

        for (let item of list.items) {
            let entryPoint = this.resolveEntryPointFor(list, item, outDir);
            source += `import I${count++} from "${entryPoint}";\n`;
        }

        let max = list.items.length;
        source += "\nexport default [";
        for (let i = 1; i <= max; i++) source += `I${i},`;
        source += "];";

        let fileName = key.substring(key.indexOf("!") + 1) + ".ts";
        await genWriteFile(jk_fs.join(outDir, fileName), source);
    }
}

//endregion

export interface ArobaseChunk extends RegistryItem {
    entryPoint: string;
    itemType: string;
}

export class Type_ArobaseChunk extends ArobaseType {
    async processDir(p: { moduleDir: string; arobaseDir: string; genDir: string; }) {
        await applyTypeRulesOnDir({
            dirToScan: p.arobaseDir,
            expectFsType: "dir",

            itemDefRules: {
                rootDirName: jk_fs.basename(p.arobaseDir),
                nameConstraint: "canBeUid",
                requireRefFile: false,

                filesToResolve: {
                    "info": ["info.json"],
                    "entryPoint": ["index.tsx", "index.ts"]
                },

                transform: async (props) => {
                    if (!props.resolved?.entryPoint) {
                        throw declareError("No 'index.ts' or 'index.tsx' file found", props.itemPath);
                    }

                    const newItem: ArobaseChunk = {
                        arobaseType: this,
                        entryPoint: props.resolved.entryPoint,
                        itemType: props.parentDirName,
                        itemPath: props.itemPath,
                    };

                    addToRegistry(this.typeName + "!" + props.itemName, newItem);
                }
            }
        });
    }

    async generateCodeForItem(key: string, rItem: RegistryItem, infos: { genDir: string; }) {
        const item = rItem as ArobaseChunk;
        let outDir = this.getGenOutputDir(infos.genDir, item);
        let fileName = key.substring(key.indexOf("!") + 1);
        await createDirSymlink(jk_fs.join(outDir, fileName), jk_fs.dirname(item.entryPoint));
    }

    protected getGenOutputDir(genDir: string, _chunk: ArobaseChunk) {
        return jk_fs.join(genDir, this.typeName);
    }
}