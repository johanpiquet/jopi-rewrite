import * as jk_fs from "jopi-toolkit/jk_fs";
import * as jk_tools from "jopi-toolkit/jk_tools";
import * as jk_term from "jopi-toolkit/jk_term";
import * as jk_what from "jopi-toolkit/jk_what";

const LOG = false;

//region Helpers

export async function resolveFile(dirToSearch: string, fileNames: string[]): Promise<string|undefined> {
    for (let fileName of fileNames) {
        let filePath = jk_fs.join(dirToSearch, fileName);
        if (await jk_fs.isFile(filePath)) return filePath;
    }

    return undefined;
}

export function declareLinkerError(message: string, filePath?: string): Error {
    jk_term.logBgRed("⚠️ Jopi Linker Error -", message, "⚠️");
    if (filePath) jk_term.logBlue("See:", jk_fs.pathToFileURL(filePath));
    process.exit(1);
}

export async function getSortedDirItem(dirPath: string): Promise<jk_fs.DirItem[]> {
    const items = await jk_fs.listDir(dirPath);
    return items.sort((a, b) => a.name.localeCompare(b.name));
}

//endregion

//region Registry

export interface RegistryItem {
    itemPath: string;
    arobaseType: ArobaseType;
}

export interface ReplaceItem {
    mustReplace: string;
    replaceWith: string;

    priority: PriorityLevel;
    declarationFile: string;
}

let gRegistry: Record<string, RegistryItem> = {};
let gReplacing: Record<string, ReplaceItem> = {};

//endregion

//region Generating code

export enum FilePart {
    imports = "imports",
    body = "body",
    footer = "footer",
}

export enum InstallFileType {server, browser, both}

async function generateAll() {
    function applyTemplate(template: string, header: string, body: string, footer: string): string {
        if (!header) header = "";
        if (!footer) footer = "";
        if (!body) body = "";

        template = template.replace("__HEADER", header);
        template = template.replace("__BODY", body);
        template = template.replace("__FOOTER", footer);

        return template;
    }

    function applyReplaces() {
        for (let mustReplace in gReplacing) {
            let replaceParams = gReplacing[mustReplace];

            let itemToReplaceRef = gRegistry[mustReplace];
            //
            if (!itemToReplaceRef) {
                throw declareLinkerError("Can't find the element to replace : " + mustReplace, replaceParams.declarationFile);
            }

            let replaceWithRef = gRegistry[replaceParams.replaceWith];
            //
            if (!replaceWithRef) {
                throw declareLinkerError("Can't find the element used for replacement : " + replaceParams.replaceWith, replaceParams.declarationFile);
            }

            if (itemToReplaceRef.arobaseType!==replaceWithRef.arobaseType) {
                throw declareLinkerError(`Try to replace an element of type ${itemToReplaceRef.arobaseType.typeName} with an element of type ${replaceWithRef.arobaseType.typeName}`, replaceParams.declarationFile);
            }

            gRegistry[mustReplace] = replaceWithRef;
        }
    }

    applyReplaces();

    for (let arobaseType of Object.values(gArobaseHandler)) {
        await arobaseType.beginGeneratingCode(gCodeGenWriter);

        let items: RegistryItem[] = [];

        for (let key in gRegistry) {
            const entry = gRegistry[key];
            if (entry.arobaseType === arobaseType) {
                items.push(entry);
                await entry.arobaseType.generateCodeForItem(gCodeGenWriter, key, entry);
            }
        }

        await arobaseType.endGeneratingCode(gCodeGenWriter, items);
    }

    for (let p of gModuleDirProcessors) {
        await p.generateCode(gCodeGenWriter);
    }

    let installerFile = applyTemplate(gServerInstallFileTemplate, gServerInstallFile[FilePart.imports], gServerInstallFile[FilePart.body], gServerInstallFile[FilePart.footer]);
    await jk_fs.writeTextToFile(getServerInstallScript(), installerFile);
    gServerInstallFile = {};

    installerFile = applyTemplate(gBrowserInstallFileTemplate, gBrowserInstallFile[FilePart.imports], gBrowserInstallFile[FilePart.body], gBrowserInstallFile[FilePart.footer]);
    await jk_fs.writeTextToFile(getBrowserInstallScript(), installerFile);
    gBrowserInstallFile = {};
}

export class CodeGenWriter {
    public readonly isTypeScriptOnly = gIsTypeScriptOnly;

    constructor(public readonly dir: Directories) {
    }

    toJavascriptFileName(filePath: string): string {
        let idx = filePath.lastIndexOf(".");
        if (idx!==-1) return filePath.substring(0, idx) + ".js";
        return filePath;
    }

    makePathRelatifToOutput(path: string) {
        return jk_fs.getRelativePath(this.dir.output_src, path);
    }

    async writeCodeFile(innerPath: string, typeScriptContent: string, javaScriptContent: string) {
        await jk_fs.writeTextToFile(jk_fs.join(gDir_outputSrc, innerPath), typeScriptContent);

        if (!gIsTypeScriptOnly) {
            await jk_fs.writeTextToFile(jk_fs.join(gDir_outputDst, innerPath), javaScriptContent);
        }
    }

    async symlinkDir(innerPath: string, targetDirPath_src: string) {
        if (!targetDirPath_src.startsWith(gDir_ProjectSrc)) {
            throw declareLinkerError("The target directory must be inside the source directory", targetDirPath_src);
        }

        let relPath = targetDirPath_src.substring(gDir_ProjectSrc.length);

        let srcNewDir = jk_fs.join(gDir_outputSrc, innerPath);

        // The parent dir must exist for symlink.
        await jk_fs.mkDir(jk_fs.dirname(srcNewDir));
        await jk_fs.symlink(targetDirPath_src, srcNewDir, "dir");

        if (!gIsTypeScriptOnly) {
            let targetDirPath_dist = gDir_outputDst + relPath;
            let distNewDir = jk_fs.join(gDir_outputDst, innerPath);

            if (!await jk_fs.isDirectory(targetDirPath_dist)) {
                await jk_fs.mkDir(jk_fs.dirname(targetDirPath_dist));
            }

            await jk_fs.mkDir(jk_fs.dirname(distNewDir));
            await jk_fs.unlink(distNewDir);
            await jk_fs.symlink(targetDirPath_dist, distNewDir, "dir");
        }
    }

    genAddToInstallFile_JS(who: InstallFileType, where: FilePart, javascriptContent: string) {
        function addTo(group: Record<string, string>) {
            let part = group[where] || "";
            group[where] = part + javascriptContent;
        }

        if (who===InstallFileType.both) {
            addTo(gServerInstallFile);
            addTo(gBrowserInstallFile);
        } else if (who===InstallFileType.server) {
            addTo(gServerInstallFile);
        } else if (who===InstallFileType.browser) {
            addTo(gBrowserInstallFile);
        }
    }
}

let gCodeGenWriter: CodeGenWriter;

let gServerInstallFile: Record<string, string> = {};

// Here it's ASYNC.
let gServerInstallFileTemplate = `__HEADER

export default async function(registry) {
__BODY__FOOTER
}`;

let gBrowserInstallFile: Record<string, string> = {};

// Here it's not async.
let gBrowserInstallFileTemplate = `__HEADER

export default function(registry) {
__BODY__FOOTER
}`;

//endregion

//region Processing project

async function processProject() {
    // Note: here we don't destroy the dist dir.
    await jk_fs.rmDir(gDir_outputSrc);

    await processModules();
    await generateAll();
}

async function processModules() {
    let modules = await jk_fs.listDir(gDir_ProjectSrc);

    for (let module of modules) {
        if (!module.isDirectory) continue;
        if (!module.name.startsWith("mod_")) continue;

        for (let p of gModuleDirProcessors) {
            await p.onBeginModuleProcessing(gCodeGenWriter, module.fullPath);
        }

        await processModule(module.fullPath);

        for (let p of gModuleDirProcessors) {
            await p.onEndModuleProcessing(gCodeGenWriter, module.fullPath);
        }
    }
}

async function processModule(moduleDir: string) {
    let dirItems = await jk_fs.listDir(moduleDir);
    let arobaseDir: jk_fs.DirItem|undefined;

    for (let dirItem of dirItems) {
        if (!dirItem.isDirectory) continue;
        if (dirItem.name[0] !== "@") continue;
        if (dirItem.name == "@") { arobaseDir = dirItem; continue; }

        let name = dirItem.name.substring(1);
        let arobaseType = gArobaseHandler[name];
        if (!arobaseType) throw declareLinkerError("Unknown arobase type: " + name, dirItem.fullPath);

        if (arobaseType.position !== "root") continue;
        await arobaseType.processDir({moduleDir, arobaseDir: dirItem.fullPath, genDir: gDir_outputSrc});
    }

    if (arobaseDir) {
        dirItems = await jk_fs.listDir(arobaseDir.fullPath);

        for (let dirItem of dirItems) {
            if (!dirItem.isDirectory) continue;

            let name = dirItem.name;
            let arobaseType = gArobaseHandler[name];
            if (!arobaseType) throw declareLinkerError("Unknown arobase type: " + name, dirItem.fullPath);

            if (arobaseType.position === "root") continue;
            await arobaseType.processDir({moduleDir, arobaseDir: dirItem.fullPath, genDir: gDir_outputSrc});
        }
    }
}

//endregion

//region Extensions

export abstract class ArobaseType {
    constructor(public readonly typeName: string, public readonly position?: "root"|undefined) {
    }

    abstract processDir(p: { moduleDir: string; arobaseDir: string; genDir: string; }): Promise<void>;

    //region Codegen

    generateCodeForItem(writer: CodeGenWriter, key: string, rItem: RegistryItem): Promise<void> {
        return Promise.resolve();
    }

    beginGeneratingCode(writer: CodeGenWriter): Promise<void> {
        return Promise.resolve();
    }

    endGeneratingCode(writer: CodeGenWriter, items: RegistryItem[]): Promise<void> {
        return Promise.resolve();
    }

    //endregion

    declareError(message: string, filePath?: string): Error {
        return declareLinkerError(message, filePath);
    }

    //region Rules

    /**
     * Process a directory containing item to process.
     *
     * ruleDir/itemType/newItem1
     *                 /newItem2
     *                    ^- we will iterate it
     *           ^-- we are here
     */
    async rules_applyRulesOnDir(p: RulesFor_Collection) {
        const dirItems = await jk_fs.listDir(p.dirToScan);

        for (let entry of dirItems) {
            if ((entry.name[0] === ".") || (entry.name[0] === "_")) continue;

            if (p.expectFsType === "file") {
                if (entry.isFile) {
                    await this.rules_applyRulesOnChildDir(p.itemDefRules, entry);
                }
            } else if (p.expectFsType === "dir") {
                if (entry.isDirectory) {
                    await this.rules_applyRulesOnChildDir(p.itemDefRules, entry);
                }
            } else if (p.expectFsType === "fileOrDir") {
                await this.rules_applyRulesOnChildDir(p.itemDefRules, entry);
            }
        }
    }

    /**
     * Process an item to process.
     * Will analyze it and extract common informations.
     *
     * ruleDir/itemType/newItem/...
     *                  ^-- we are here
     */
    async rules_applyRulesOnChildDir(p: RulesFor_CollectionItem, dirItem: jk_fs.DirItem) {
        const thisIsFile = dirItem.isFile;
        const thisFullPath = dirItem.fullPath;
        const thisName = dirItem.name;
        let thisNameAsUID: string|undefined;

        // The file / folder-name is a UUID4?
        let thisIsUUID = jk_tools.isUUIDv4(thisName);

        if (thisIsUUID) {
            if (p.nameConstraint==="mustNotBeUid") {
                throw declareLinkerError("The name must NOT be an UID", thisFullPath);
            }

            thisNameAsUID = thisName;
        } else {
            if (p.nameConstraint==="mustBeUid") {
                throw declareLinkerError("The name MUST be an UID", thisFullPath);
            }
        }

        // It's a file?
        if (thisIsFile) {
            // Process it now.
            await p.transform({
                itemName: thisName,
                uid: thisIsUUID ? thisName : undefined,
                priority: PriorityLevel.default,

                itemPath: thisFullPath, isFile: thisIsFile,
                parentDirName: p.rootDirName,

                resolved: {}
            });

            return;
        }

        // Will search references to config.json / index.tsx / ...
        //
        let resolved: Record<string, string | undefined> = {};
        //
        if (p.filesToResolve) {
            for (let key in p.filesToResolve) {
                resolved[key] = await resolveFile(thisFullPath, p.filesToResolve[key]);
            }
        }

        // Search the "uid.myuid" file, which allows knowing the uid of the item.
        //
        const result = await this.rules_analizeDirContent(thisFullPath, p);

        const myUid = result.myUid;
        const refTarget = result.refTarget;
        const conditions = result.conditionsFound;
        let priority = result.priority!;

        if (!priority) {
            priority = PriorityLevel.default;
            await jk_fs.writeTextToFile(jk_fs.join(thisFullPath, "default.priority"), "default.priority");
        }

        if (myUid) {
            // If itemUid already defined, then must match myUidFile.
            if (thisNameAsUID && (thisNameAsUID!==myUid)) {
                throw declareLinkerError("The UID in the .myuid file is NOT the same as the UID in the folder name", thisFullPath);
            }

            thisNameAsUID = myUid;
        }

        await p.transform({
            itemName: thisName, uid: thisNameAsUID, refTarget,
            itemPath: thisFullPath, isFile: thisIsFile, resolved, priority,
            parentDirName: p.rootDirName,
            conditions
        });
    }

    /**
     * Analyse the content of a dir, extract information and check rules.
     * @param dirPath
     * @param rules
     * @param useThisUid
     */
    private async rules_analizeDirContent(dirPath: string, rules: DirAnalizingRules, useThisUid?: string | undefined): Promise<AnalizeDirResult> {
        function decodeCond(condName: string) {
            // Remove .cond at the end.
            condName = condName.slice(0, -5);

            condName = condName.toLowerCase();
            if (condName.startsWith("if")) condName = condName.substring(2);
            condName = condName.replace("-", "");
            condName = condName.replace("_", "");

            return condName;
        }

        function decodePriority(priorityName: string, itemFullPath: string): PriorityLevel {
            priorityName = priorityName.toLowerCase();
            priorityName = priorityName.replace("-", "");
            priorityName = priorityName.replace("_", "");

            switch (priorityName) {
                case "default.priority":
                    return PriorityLevel.default;
                case "veryhigh.priority":
                    return PriorityLevel.veryHigh;
                case "high.priority":
                    return PriorityLevel.high;
                case "low.priority":
                    return PriorityLevel.low;
                case "verylow.priority":
                    return PriorityLevel.veryLow;
            }

            throw declareLinkerError("Unknown priority name: " + jk_fs.basename(itemFullPath, ".priority"), itemFullPath);
        }

        function addNameIntoFile(filePath: string, name: string = jk_fs.basename(filePath)) {
            return jk_fs.writeTextToFile(filePath, name);
        }

        async function checkDirItem(entry: jk_fs.DirItem) {
            if (entry.isSymbolicLink) return false;
            if (entry.name[0] === ".") return false;

            if (entry.isDirectory) {
                if (entry.name==="_") {
                    let uid = useThisUid || jk_tools.generateUUIDv4();
                    let newPath = jk_fs.join(jk_fs.dirname(entry.fullPath), uid);
                    await jk_fs.rename(entry.fullPath, newPath);

                    entry.name = uid;
                    entry.fullPath = newPath;
                }

                if (entry.name[0]== "_") return false;
            }
            else {
                if (entry.name === "_.myuid") {
                    let uid = useThisUid || jk_tools.generateUUIDv4();
                    await jk_fs.unlink(entry.fullPath);
                    entry.fullPath = jk_fs.join(jk_fs.dirname(entry.fullPath), uid + ".myuid");
                    entry.name = uid + ".myuid";

                    await jk_fs.writeTextToFile(entry.fullPath, uid);
                }

                if (entry.name[0]== "_") return false;

                if (entry.name.endsWith(".myuid")) {
                    if (result.myUid) {
                        throw declareLinkerError("More than one .myuid file found here", entry.fullPath);
                    }

                    result.myUid = entry.name.slice(0, -6);
                    await addNameIntoFile(entry.fullPath);
                }
                else if (entry.name.endsWith(".priority")) {
                    if (result.priority) {
                        throw declareLinkerError("More than one .priority file found here", entry.fullPath);
                    }

                    if (rules.requirePriority===false) {
                        throw declareLinkerError("A .priority file is NOT expected here", entry.fullPath);
                    }

                    await addNameIntoFile(entry.fullPath);
                    result.priority = decodePriority(entry.name, entry.fullPath);
                }
                else if (entry.name.endsWith(".cond")) {
                    if (rules.allowConditions===false) {
                        throw declareLinkerError("A .cond file is NOT expected here", entry.fullPath);
                    }

                    await addNameIntoFile(entry.fullPath);

                    if (!result.conditionsFound)  result.conditionsFound = new Set<string>();
                    result.conditionsFound.add(decodeCond(entry.name));
                }
                else if (entry.name.endsWith(".ref")) {
                    if (result.refTarget) {
                        throw declareLinkerError("More than one .ref file found here", entry.fullPath);
                    }

                    if (rules.requireRefFile === false) {
                        throw declareLinkerError("A .ref file is NOT expected here", entry.fullPath);
                    }

                    result.refTarget = entry.name.slice(0, -4);

                    await addNameIntoFile(entry.fullPath);
                }

                return true;
            }
        }

        let result: AnalizeDirResult = { dirItems: [] };

        const items = await getSortedDirItem(dirPath);

        for (let item of items) {
            if (!await checkDirItem(item)) continue;
            result.dirItems.push(item);
        }

        return result;
    }

    //endregion

    //region Registry

    registry_requireItem<T extends RegistryItem>(key: string, requireType?: ArobaseType): T {
        const entry = gRegistry[key];
        if (!entry) throw declareLinkerError("The item " + key + " is required but not defined");
        if (requireType && (entry.arobaseType !== requireType)) throw declareLinkerError("The item " + key + " is not of the expected type @" + requireType.typeName);
        return entry as T;
    }

    registry_getItem<T extends RegistryItem>(key: string, requireType?: ArobaseType): T|undefined {
        const entry = gRegistry[key];
        if (requireType && entry && (entry.arobaseType !== requireType)) throw declareLinkerError("The item " + key + " is not of the expected type @" + requireType.typeName);
        return entry as T;
    }

    registry_addReplaceRule(mustReplace: string, replaceWith: string, priority: PriorityLevel|undefined, declarationFile: string) {
        if (!priority) priority = PriorityLevel.default;
        let current = gReplacing[mustReplace];

        if (current) {
            if (current.priority>priority) return;
        }

        gReplacing[mustReplace] = {declarationFile, mustReplace, replaceWith, priority};

        if (LOG) console.log("Add REPLACE", mustReplace, "=>", replaceWith, "priority", priority);
    }

    registry_addItem<T extends RegistryItem>(uid: string, item: T) {
        if (gRegistry[uid]) declareLinkerError("The UID " + uid + " is already defined", gRegistry[uid].itemPath);

        gRegistry[uid] = item;

        if (LOG) {
            const relPath = jk_fs.getRelativePath(gDir_ProjectSrc, item.itemPath);
            console.log(`Add ${uid} to registry. Path: ${relPath}`);
        }
    }

    //endregion
}

export interface DirAnalizingRules {
    requireRefFile?: boolean;
    allowConditions?: boolean;
    requirePriority?: boolean
}

export interface RulesFor_Collection {
    dirToScan: string;
    expectFsType: "file"|"dir"|"fileOrDir";
    itemDefRules: RulesFor_CollectionItem;
}

export interface RulesFor_CollectionItem extends DirAnalizingRules {
    rootDirName: string;
    filesToResolve?: Record<string, string[]>;
    nameConstraint: "canBeUid"|"mustNotBeUid"|"mustBeUid";

    transform: (props: TransformItemParams) => Promise<void>;
}

export interface TransformItemParams {
    itemName: string;
    itemPath: string;
    isFile: boolean;

    uid?: string;
    refTarget?: string;
    conditions?: Set<string>;

    parentDirName: string;
    priority: PriorityLevel;

    resolved: Record<string, string|undefined>;
}

export enum PriorityLevel {
    veryLow = -200,
    low = -100,
    default = 0,
    high = 100,
    veryHigh = 200,
}

export interface AnalizeDirResult {
    dirItems: jk_fs.DirItem[];

    myUid?: string;
    priority?: PriorityLevel;
    refTarget?: string;
    conditionsFound?: Set<string>;
}

export class ModuleDirProcessor {
    onBeginModuleProcessing(writer: CodeGenWriter, moduleDir: string): Promise<void> {
        return Promise.resolve();
    }

    onEndModuleProcessing(writer: CodeGenWriter, moduleDir: string): Promise<void> {
        return Promise.resolve();
    }

    generateCode(writer: CodeGenWriter): Promise<void> {
        return Promise.resolve();
    }
}

let gArobaseHandler: Record<string, ArobaseType> = {};
let gModuleDirProcessors: ModuleDirProcessor[] = [];

//endregion

//region Bootstrap

let gDir_ProjectRoot: string;
let gDir_ProjectSrc: string;
let gDir_ProjectDist: string;
let gDir_outputSrc: string;
let gDir_outputDst: string;

export function getBrowserInstallScript() {
    return jk_fs.join(gDir_outputDst, "installBrowser.js");
}

export function getServerInstallScript() {
    return jk_fs.join(gDir_outputDst, "installServer.js");
}

export interface Directories {
    project: string;
    project_src: string;
    project_dst: string;

    output_src: string;
    output_dist: string;
}

let gIsTypeScriptOnly: boolean;

export async function compile(importMeta: any, config: LinkerConfig): Promise<void> {
    async function searchLinkerScript(): Promise<string|undefined> {
        let jopiLinkerScript = jk_fs.join(gDir_ProjectRoot, "dist", "jopi-linker.js");
        if (await jk_fs.isFile(jopiLinkerScript)) return jopiLinkerScript;

        if (jk_what.isBunJS) {
            jopiLinkerScript = jk_fs.join(gDir_ProjectSrc, "jopi-linker.ts");
            if (await jk_fs.isFile(jopiLinkerScript)) return jopiLinkerScript;
        }

        return undefined;
    }

    gDir_ProjectRoot = config.projectRootDir;
    gDir_ProjectSrc = jk_fs.join(gDir_ProjectRoot, "src");
    gDir_ProjectDist = jk_fs.join(gDir_ProjectRoot, "dist");

    gDir_outputSrc = jk_fs.join(gDir_ProjectSrc, "_jopiLinkerGen");
    gDir_outputDst = jk_fs.join(gDir_ProjectDist, "_jopiLinkerGen");

    gIsTypeScriptOnly = !importMeta.filename.endsWith(".js");

    gCodeGenWriter = new CodeGenWriter({
        project: gDir_ProjectRoot,
        project_src: gDir_ProjectSrc,
        project_dst: gDir_ProjectDist,

        output_src: gDir_outputSrc,
        output_dist: gDir_outputDst
    });

    let jopiLinkerScript = await searchLinkerScript();
    if (jopiLinkerScript) await import(jopiLinkerScript);

    gServerInstallFileTemplate = config.templateForServer;
    gBrowserInstallFileTemplate = config.templateForBrowser;

    gArobaseHandler = {};

    for (let aType of config.arobaseTypes) {
        gArobaseHandler[aType.typeName] = aType;
    }

    gModuleDirProcessors = [];

    for (let p of config.modulesProcess) {
        gModuleDirProcessors.push(p);
    }

    await processProject();
}

export interface LinkerConfig {
    projectRootDir: string;
    templateForBrowser: string;
    templateForServer: string;
    arobaseTypes: ArobaseType[];
    modulesProcess: ModuleDirProcessor[];
}

//endregion