import * as jk_fs from "jopi-toolkit/jk_fs";
import * as jk_tools from "jopi-toolkit/jk_tools";
import * as jk_term from "jopi-toolkit/jk_term";
import * as jk_app from "jopi-toolkit/jk_app";
import * as jk_what from "jopi-toolkit/jk_what";
import * as jk_crypto from "jopi-toolkit/jk_crypto";

const LOG = false;

//region Helpers

export interface AnalizeDirResult {
    dirItems: jk_fs.DirItem[];

    myUid?: string;
    priority?: PriorityLevel;
    refTarget?: string;
    conditionsFound?: Set<string>;
}

export async function resolve(dirToSearch: string, fileNames: string[]): Promise<string|undefined> {
    for (let fileName of fileNames) {
        let filePath = jk_fs.join(dirToSearch, fileName);
        if (await jk_fs.isFile(filePath)) return filePath;
    }

    return undefined;
}

export function declareError(message: string, filePath?: string): Error {
    jk_term.logBgRed("⚠️ Jopi Linker Error -", message, "⚠️");
    if (filePath) jk_term.logBlue("See:", jk_fs.pathToFileURL(filePath));
    process.exit(1);
}

export function addNameIntoFile(filePath: string, name: string = jk_fs.basename(filePath)) {
    return jk_fs.writeTextToFile(filePath, name);
}

export async function getSortedDirItem(dirPath: string): Promise<jk_fs.DirItem[]> {
    const items = await jk_fs.listDir(dirPath);
    return items.sort((a, b) => a.name.localeCompare(b.name));
}

export async function analizeDirContent(dirPath: string, rules: DirAnalizingRules, useThisUid?: string | undefined): Promise<AnalizeDirResult> {
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

        throw declareError("Unknown priority name: " + jk_fs.basename(itemFullPath, ".priority"), itemFullPath);
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
                    throw declareError("More than one .myuid file found here", entry.fullPath);
                }

                result.myUid = entry.name.slice(0, -6);
                await addNameIntoFile(entry.fullPath);
            }
            else if (entry.name.endsWith(".priority")) {
                if (result.priority) {
                    throw declareError("More than one .priority file found here", entry.fullPath);
                }

                if (rules.requirePriority===false) {
                    throw declareError("A .priority file is NOT expected here", entry.fullPath);
                }

                await addNameIntoFile(entry.fullPath);
                result.priority = decodePriority(entry.name, entry.fullPath);
            }
            else if (entry.name.endsWith(".cond")) {
                if (rules.allowConditions===false) {
                    throw declareError("A .cond file is NOT expected here", entry.fullPath);
                }

                await addNameIntoFile(entry.fullPath);

                if (!result.conditionsFound)  result.conditionsFound = new Set<string>();
                result.conditionsFound.add(decodeCond(entry.name));
            }
            else if (entry.name.endsWith(".ref")) {
                if (result.refTarget) {
                    throw declareError("More than one .ref file found here", entry.fullPath);
                }

                if (rules.requireRefFile === false) {
                    throw declareError("A .ref file is NOT expected here", entry.fullPath);
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

export function requireRegistryItem<T extends RegistryItem>(key: string, requireType?: ArobaseType): T {
    const entry = gRegistry[key];
    if (!entry) throw declareError("The item " + key + " is required but not defined");
    if (requireType && (entry.arobaseType !== requireType)) throw declareError("The item " + key + " is not of the expected type @" + requireType.typeName);
    return entry as T;
}

export function getRegistryItem<T extends RegistryItem>(key: string, requireType?: ArobaseType): T|undefined {
    const entry = gRegistry[key];
    if (requireType && entry && (entry.arobaseType !== requireType)) throw declareError("The item " + key + " is not of the expected type @" + requireType.typeName);
    return entry as T;
}

export function addReplace(mustReplace: string, replaceWith: string, priority: PriorityLevel|undefined, declarationFile: string) {
    if (!priority) priority = PriorityLevel.default;
    let current = gReplacing[mustReplace];

    if (current) {
        if (current.priority>priority) return;
    }

    gReplacing[mustReplace] = {declarationFile, mustReplace, replaceWith, priority};

    if (LOG) console.log("Add REPLACE", mustReplace, "=>", replaceWith, "priority", priority);
}

export function addToRegistry<T extends RegistryItem>(uid: string, item: T) {
    if (gRegistry[uid]) declareError("The UID " + uid + " is already defined", gRegistry[uid].itemPath);

    gRegistry[uid] = item;

    if (LOG) {
        const relPath = jk_fs.getRelativePath(gSrcRootDir, item.itemPath);
        console.log(`Add ${uid} to registry. Path: ${relPath}`);
    }
}

//endregion

//region Generating code

export enum FilePart {
    imports = "imports",
    body = "body",
    footer = "footer",
}

export enum InstallFileType {server, browser, both}

const gDefaultInstallTemplate = `
__HEADER
export default function() {
__BODY
__FOOTER
}
    `;

let gServerInstallFile: Record<string, string> = {};
let gServerInstallFileTemplate = gDefaultInstallTemplate;

let gBrowserInstallFile: Record<string, string> = {};
let gBrowserInstallFileTemplate = gDefaultInstallTemplate;

function calRelativePath(from: string) {
    return jk_fs.getRelativePath(gGenRootDir, from);
}

let gWriteReport: string[] = [];

export async function genCreateDirSymlink(newFilePath: string, targetFilePath: string) {
    gWriteReport.push(`genCreateDirSymlink|${calRelativePath(newFilePath)}|${calRelativePath(targetFilePath)}`);

    await jk_fs.mkDir(jk_fs.dirname(newFilePath));
    await jk_fs.symlink(targetFilePath, newFilePath, "dir");
}

export async function genWriteFile(filePath: string, fileContent: string): Promise<void> {
    gWriteReport.push(`genWriteFile|${calRelativePath(filePath)}|${jk_crypto.md5(fileContent)}`);

    await jk_fs.mkDir(jk_fs.dirname(filePath));
    return jk_fs.writeTextToFile(filePath, fileContent);
}

export function genAddToInstallFile(who: InstallFileType, where: FilePart, text: string) {
    function addTo(group: Record<string, string>) {
        let part = group[where] || "";
        group[where] = part + text;
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
                throw declareError("Can't find the element to replace : " + mustReplace, replaceParams.declarationFile);
            }

            let replaceWithRef = gRegistry[replaceParams.replaceWith];
            //
            if (!replaceWithRef) {
                throw declareError("Can't find the element used for replacement : " + replaceParams.replaceWith, replaceParams.declarationFile);
            }

            if (itemToReplaceRef.arobaseType!==replaceWithRef.arobaseType) {
                throw declareError(`Try to replace an element of type ${itemToReplaceRef.arobaseType.typeName} with an element of type ${replaceWithRef.arobaseType.typeName}`, replaceParams.declarationFile);
            }

            gRegistry[mustReplace] = replaceWithRef;
        }
    }

    applyReplaces();

    const infos = {genDir: gGenRootDir};

    for (let arobaseType of Object.values(gArobaseHandler)) {
        await arobaseType.beginGeneratingCode();

        let items: RegistryItem[] = [];

        for (let key in gRegistry) {
            const entry = gRegistry[key];
            if (entry.arobaseType === arobaseType) {
                items.push(entry);
                await entry.arobaseType.generateCodeForItem(key, entry, infos);
            }
        }

        await arobaseType.endGeneratingCode(items);
    }

    for (let p of gModuleDirProcessors) {
        await p.generateCode();
    }

    let installerFile = applyTemplate(gServerInstallFileTemplate, gServerInstallFile[FilePart.imports], gServerInstallFile[FilePart.body], gServerInstallFile[FilePart.footer]);
    await jk_fs.writeTextToFile(jk_fs.join(gGenRootDir, "installServer.ts"), installerFile);
    gServerInstallFile = {};

    installerFile = applyTemplate(gBrowserInstallFileTemplate, gBrowserInstallFile[FilePart.imports], gBrowserInstallFile[FilePart.body], gBrowserInstallFile[FilePart.footer]);
    await jk_fs.writeTextToFile(jk_fs.join(gGenRootDir, "installBrowser.ts"), installerFile);
    gBrowserInstallFile = {};
}

export function setInstallerTemplate(type: InstallFileType, template: string) {
    if (type === InstallFileType.both) {
        gServerInstallFileTemplate = template;
        gBrowserInstallFileTemplate = template;
    } else if (type === InstallFileType.server) {
        gServerInstallFileTemplate = template;
    } else if (type === InstallFileType.browser) {
        gBrowserInstallFileTemplate = template;
    }
}

//endregion

//region Processing dir

export interface DirAnalizingRules {
    requireRefFile?: boolean;
    allowConditions?: boolean;
    requirePriority?: boolean
}

export interface TypeRules_CollectionItem extends DirAnalizingRules {
    rootDirName: string;
    filesToResolve?: Record<string, string[]>;
    nameConstraint: "canBeUid"|"mustNotBeUid"|"mustBeUid";

    transform: (props: TransformParams) => Promise<void>;
}

export interface RulesFor_Collection {
    dirToScan: string;
    expectFsType: "file"|"dir"|"fileOrDir";
    itemDefRules: TypeRules_CollectionItem;
}

export interface TransformParams {
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

/**
 * Process the root directory of a type.
 *
 * ruleType/itemType/newRule/...
 *          ^- we will iterate it
 * ^-- we are here
 */
export async function applyTypeRulesOnDir(p: RulesFor_Collection) {
    const dirItems = await jk_fs.listDir(p.dirToScan);

    for (let entry of dirItems) {
        if ((entry.name[0] === ".") || (entry.name[0] === "_")) continue;

        if (p.expectFsType === "file") {
            if (entry.isFile) {
                await applyTypeRulesOnChildDir(p.itemDefRules, entry);
            }
        } else if (p.expectFsType === "dir") {
            if (entry.isDirectory) {
                await applyTypeRulesOnChildDir(p.itemDefRules, entry);
            }
        } else if (p.expectFsType === "fileOrDir") {
            await applyTypeRulesOnChildDir(p.itemDefRules, entry);
        }
    }
}

/**
 * Process the subdirectory of a type.
 * Generally, it's the rule we add.
 *
 * ruleType/itemType/newRule/...
 *                   ^- we will iterate on it
 *          ^-- we are here
 */
export async function applyTypeRulesOnChildDir(p: TypeRules_CollectionItem, dirItem: jk_fs.DirItem) {
    const thisIsFile = dirItem.isFile;
    const thisFullPath = dirItem.fullPath;
    const thisName = dirItem.name;
    let thisNameAsUID: string|undefined;

    // The file / folder-name is a UUID4?
    let thisIsUUID = jk_tools.isUUIDv4(thisName);

    if (thisIsUUID) {
        if (p.nameConstraint==="mustNotBeUid") {
            throw declareError("The name must NOT be an UID", thisFullPath);
        }

        thisNameAsUID = thisName;
    } else {
        if (p.nameConstraint==="mustBeUid") {
            throw declareError("The name MUST be an UID", thisFullPath);
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
            resolved[key] = await resolve(thisFullPath, p.filesToResolve[key]);
        }
    }

    // Search the "uid.myuid" file, which allows knowing the uid of the item.
    //
    const result = await analizeDirContent(thisFullPath, p);

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
            throw declareError("The UID in the .myuid file is NOT the same as the UID in the folder name", thisFullPath);
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

//endregion

//region Processing project

async function processProject() {
    await jk_fs.rmDir(gGenRootDir);
    await processModules();
    await generateAll();
}

async function processModules() {
    let modules = await jk_fs.listDir(gSrcRootDir);

    for (let module of modules) {
        if (!module.isDirectory) continue;
        if (!module.name.startsWith("mod_")) continue;

        for (let p of gModuleDirProcessors) {
            await p.onBeginModuleProcessing(module.fullPath);
        }

        await processModule(module.fullPath);

        for (let p of gModuleDirProcessors) {
            await p.onEndModuleProcessing(module.fullPath);
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
        if (!arobaseType) throw declareError("Unknown arobase type: " + name, dirItem.fullPath);

        if (arobaseType.position !== "root") continue;
        await arobaseType.processDir({moduleDir, arobaseDir: dirItem.fullPath, genDir: gGenRootDir});
    }

    if (arobaseDir) {
        dirItems = await jk_fs.listDir(arobaseDir.fullPath);

        for (let dirItem of dirItems) {
            if (!dirItem.isDirectory) continue;

            let name = dirItem.name;
            let arobaseType = gArobaseHandler[name];
            if (!arobaseType) throw declareError("Unknown arobase type: " + name, dirItem.fullPath);

            if (arobaseType.position === "root") continue;
            await arobaseType.processDir({moduleDir, arobaseDir: dirItem.fullPath, genDir: gGenRootDir});
        }
    }
}

//endregion

//region Extensions

export abstract class ArobaseType {
    constructor(public readonly typeName: string, public readonly position?: "root"|undefined) {
    }

    abstract processDir(p: { moduleDir: string; arobaseDir: string; genDir: string; }): Promise<void>;

    generateCodeForItem(key: string, rItem: RegistryItem, infos: { genDir: string; }): Promise<void> {
        return Promise.resolve();
    }

    beginGeneratingCode(): Promise<void> {
        return Promise.resolve();
    }

    endGeneratingCode(items: RegistryItem[]): Promise<void> {
        return Promise.resolve();
    }
}

export class ModuleDirProcessor {
    onBeginModuleProcessing(moduleDir: string): Promise<void> {
        return Promise.resolve();
    }

    onEndModuleProcessing(moduleDir: string): Promise<void> {
        return Promise.resolve();
    }

    generateCode(): Promise<void> {
        return Promise.resolve();
    }
}

export function addArobaseType(type: ArobaseType) {
    return gArobaseHandler[type.typeName] = type;
}

export function addModuleDirProcess(p: ModuleDirProcessor) {
    gModuleDirProcessors.push(p);
}

let gArobaseHandler: Record<string, ArobaseType> = {};
let gModuleDirProcessors: ModuleDirProcessor[] = [];

//endregion

//region Bootstrap

let gProjectRootDir: string;
let gGenRootDir: string;
let gSrcRootDir: string;

export function getProjectGenDir() {
    return gGenRootDir;
}

export function getProjectSourceDir() {
    return gSrcRootDir;
}

export function init(rootDir?: string) {
    if (gIsInit) return;
    gIsInit = true;

    if (!rootDir) rootDir = jk_app.findPackageJsonDir()

    gProjectRootDir = rootDir;
    gSrcRootDir = jk_fs.join(gProjectRootDir, "src");
    gGenRootDir = jk_fs.join(gSrcRootDir, "_jopiLinkerGen");
}

export async function compile(rootDir?: string): Promise<boolean> {
    if (gIsCompiled) return false;
    gIsCompiled = true;

    async function searchLinkerScript(): Promise<string|undefined> {
        let jopiLinkerScript = jk_fs.join(gProjectRootDir, "dist", "jopi-linker.js");
        if (await jk_fs.isFile(jopiLinkerScript)) return jopiLinkerScript;

        if (jk_what.isBunJS) {
            jopiLinkerScript = jk_fs.join(gSrcRootDir, "jopi-linker.ts");
            if (await jk_fs.isFile(jopiLinkerScript)) return jopiLinkerScript;
        }

        return undefined;
    }

    init(rootDir);

    let jopiLinkerScript = await searchLinkerScript();
    if (jopiLinkerScript) await import(jopiLinkerScript);

    let proofFilePath = jk_fs.join(gGenRootDir, "changeProof.md5");

    let oldProofString;
    try { oldProofString = await jk_fs.readTextFromFile(proofFilePath); }
    catch { oldProofString = ""; }

    await processProject();

    let newProofString = jk_crypto.md5(gWriteReport.sort().join("\n"));
    await jk_fs.writeTextToFile(proofFilePath, newProofString);

    return oldProofString !== newProofString;
}

let gIsInit = false;
let gIsCompiled = false;

//endregion