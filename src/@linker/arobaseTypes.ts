import * as jk_fs from "jopi-toolkit/jk_fs";
import * as jk_tools from "jopi-toolkit/jk_tools";
import * as jk_events from "jopi-toolkit/jk_events";

import {
    type ProcessDirItemParams,
    getSortedDirItem,
    type TransformItemParams,
    PriorityLevel,
    type RegistryItem,
    ArobaseType,
    CodeGenWriter
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
    protected async onListItem(item: ArobaseListItem, list: ArobaseListItem[], dirPath: string): Promise<void> {
        list.push(item);
    }

    protected mergeLists(existingList: ArobaseList, newList: TransformItemParams) {
    }

    processDir(p: { moduleDir: string; arobaseDir: string; genDir: string; }) {
        return this.processList(p.arobaseDir);
    }

    protected async processList(listDirPath: string): Promise<void> {
        await this.dir_recurseOnDir({
            dirToScan: listDirPath,
            expectFsType: "dir",

            rules: {
                nameConstraint: "canBeUid",
                requireRefFile: false,
                requirePriority: true,
                rootDirName: jk_fs.basename(listDirPath),
                transform: (p) => this.processListItem(p)
            }
        });
    }

    protected async processListItem(p: TransformItemParams) {
        let listId = this.typeName + "!" + p.itemName!;
        const listName = p.itemName;

        // > Extract the list items.

        const dirItems = await getSortedDirItem(p.itemPath);
        let listItems: ArobaseListItem[] = [];

        const params: ProcessDirItemParams = {
            rootDirName: p.parentDirName,
            nameConstraint: "mustNotBeUid",
            requirePriority: true,

            filesToResolve: {
                "entryPoint": ["index.tsx", "index.ts"]
            },

            transform: async (item) => {
                if (item.refTarget && item.resolved.entryPoint) {
                    throw this.declareError("The list item can't have both an index file and a .ref file", item.itemPath);
                }

                const listItem: ArobaseListItem = {
                    priority: item.priority,
                    sortKey: item.itemName,
                    ref: item.refTarget,
                    entryPoint: item.resolved.entryPoint
                };

                const eventData = {itemPath: item.itemPath, item: listItem, list: listItems, mustSkip: false};
                await jk_events.sendAsyncEvent("jopi.linker.onNewListItem." + this.typeName, eventData);
                if (!eventData.mustSkip) await this.onListItem(listItem, listItems, item.itemPath);
            }
        };

        for (let dirItem of dirItems) {
            if (!dirItem.isDirectory) continue;

            if (dirItem.name === "_") {
                let uid = jk_tools.generateUUIDv4();
                let newPath = jk_fs.join(jk_fs.dirname(dirItem.fullPath), uid);
                await jk_fs.rename(dirItem.fullPath, newPath);

                dirItem.name = uid;
                dirItem.fullPath = newPath;
            }

            if ((dirItem.name[0] === "_") || (dirItem.name[0] === ".")) continue;

            await this.dir_processItem(dirItem, params);
        }

        // > Add the list.

        let current = this.registry_getItem<ArobaseList>(listId, this);

        if (!current) {
            const newItem: ArobaseList = {
                listName, conditions: p.conditions,
                arobaseType: this, itemPath: p.itemPath,
                items: listItems, itemsType: p.parentDirName, allDirPath: [p.itemPath]
            };

            this.registry_addItem(listId, newItem);
            return;
        }

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

        this.mergeLists(current, p);
        await jk_events.sendAsyncEvent("jopi.linker.mergeLists." + this.typeName, {arobaseType: this, current, newList: p});

        if (current.itemsType !== p.parentDirName) {
            throw this.declareError(`The list ${listId} is already defined and has a different type: ${current.itemsType}`, p.itemPath);
        }

        current.allDirPath.push(p.itemPath);
        current.items.push(...listItems);
    }

    protected getGenOutputDir(_list: ArobaseList) {
        return this.typeName;
    }

    protected resolveEntryPointFor(list: ArobaseList, item: ArobaseListItem): string {
        let entryPoint = item.entryPoint!;

        if (!entryPoint) {
            let d = this.registry_requireItem<ArobaseChunk>(item.ref!);
            if (d.itemType!==list.itemsType) {
                throw this.declareError(`Type mismatch. Expect ${list.itemsType}`, d.itemPath)
            }

            if (!d.entryPoint) {
                throw this.declareError(`Item if missing index.ts/index.tsx file`, d.itemPath)
            }

            entryPoint = d.entryPoint;
        }

        return entryPoint;
    }

    async generateCodeForItem(writer: CodeGenWriter, key: string, rItem: RegistryItem) {
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

        await this.generateCodeForList(writer, key, list);
    }

    protected async generateCodeForList(writer: CodeGenWriter, key: string, list: ArobaseList): Promise<void> {
        let tsSource = "";
        let jsSource = "";
        let count = 1;

        let outDir_innerPath = this.getGenOutputDir(list);
        let outDir_fullPath = jk_fs.join(writer.dir.output_src, outDir_innerPath);

        for (let item of list.items) {
            let entryPoint = this.resolveEntryPointFor(list, item);
            let relPath = jk_fs.getRelativePath(outDir_fullPath, entryPoint);

            tsSource += `import I${count} from "${relPath}";\n`;
            jsSource += `import I${count} from "${writer.toJavascriptFileName(relPath)}";\n`;
            count++;
        }

        let max = list.items.length;
        tsSource += "\nexport default [";
        for (let i = 1; i <= max; i++) tsSource += `I${i},`;
        tsSource += "];";

        let fileName = key.substring(key.indexOf("!") + 1) + ".ts";

        // Here TypeScript and JavaScript are the same.
        await writer.writeCodeFile(jk_fs.join(outDir_innerPath, fileName), tsSource, jsSource);
    }
}

//endregion

//region ArobaseChunk

export interface ArobaseChunk extends RegistryItem {
    entryPoint: string;
    itemType: string;
}

export class Type_ArobaseChunk extends ArobaseType {
    async onChunk(chunk: ArobaseChunk, key: string, dirPath: string) {
        this.registry_addItem(key, chunk);
    }

    async processDir(p: { moduleDir: string; arobaseDir: string; genDir: string; }) {
        await this.dir_recurseOnDir({
            dirToScan: p.arobaseDir,
            expectFsType: "dir",

            rules: {
                rootDirName: jk_fs.basename(p.arobaseDir),
                nameConstraint: "canBeUid",
                requireRefFile: false,
                requirePriority: true,

                filesToResolve: {
                    "info": ["info.json"],
                    "entryPoint": ["index.tsx", "index.ts"]
                },

                transform: async (props) => {
                    if (!props.resolved?.entryPoint) {
                        throw this.declareError("No 'index.ts' or 'index.tsx' file found", props.itemPath);
                    }

                    const chunk: ArobaseChunk = {
                        arobaseType: this,
                        entryPoint: props.resolved.entryPoint,
                        itemType: props.parentDirName,
                        itemPath: props.itemPath,
                        priority: props.priority
                    };

                    const key = this.typeName + "!" + props.itemName;
                    const eventData = {mustSkip: false, key, chunk, itemPath: props.itemPath};
                    await jk_events.sendAsyncEvent("jopi.linker.onNewChunk." + this.typeName, eventData);

                    if (!eventData.mustSkip) {
                        await this.onChunk(chunk, key, props.itemPath);
                    }
                }
            }
        });
    }

    async generateCodeForItem(writer: CodeGenWriter, key: string, rItem: RegistryItem) {
        const item = rItem as ArobaseChunk;
        let outDir = this.getGenOutputDir(item);
        let targetName = key.substring(key.indexOf("!") + 1);
        await writer.symlinkDir(jk_fs.join(outDir, targetName), item.itemPath);
    }

    protected getGenOutputDir(_chunk: ArobaseChunk) {
        return this.typeName;
    }
}

//endregion