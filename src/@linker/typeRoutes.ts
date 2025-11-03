import {
    addNameIntoFile,
    ArobaseType,
    CodeGenWriter,
    FilePart,
    getWriter,
    InstallFileType,
    useCanonicalFileName
} from "./engine.ts";
import * as jk_fs from "jopi-toolkit/jk_fs";
import * as jk_app from "jopi-toolkit/jk_app";
import type {RouteAttributs} from "jopi-rewrite/generated";

export default class TypeRoutes extends ArobaseType {
    private sourceCode_header = `import {routeBindPage, routeBindVerb} from "jopi-rewrite/generated";`;
    private sourceCode_body = ``;
    private outputDir: string = "";
    private cwdDir: string = process.cwd();
    private routeCount: number = 1;

    async beginGeneratingCode(writer: CodeGenWriter): Promise<void> {
        this.sourceCode_body = `\n\nexport default async function(webSite) {${this.sourceCode_body}\n}`;

        let filePath = jk_fs.join(writer.dir.output_dir, "declareServerRoutes.js");
        await jk_fs.writeTextToFile(filePath, this.sourceCode_header + this.sourceCode_body);

        writer.genAddToInstallFile(InstallFileType.server, FilePart.imports, `\nimport declareRoutes from "./declareServerRoutes.js";`);
        writer.genAddToInstallFile(InstallFileType.server, FilePart.footer, "\n    await declareRoutes(registry);");
    }

    async processDir(p: { moduleDir: string; arobaseDir: string; genDir: string; }) {
        this.outputDir = getWriter().dir.output_dir;
        await this.scanDir(p.arobaseDir, "/", await this.scanAttributs(p.arobaseDir));
    }

    private bindPage(route: string, filePath: string, attributs: RouteAttributs) {
        let routeId = "r" + (this.routeCount++);
        let srcFilePath = jk_fs.getRelativePath(this.cwdDir, filePath);

        filePath = jk_app.getCompiledFilePathFor(filePath);
        let distFilePath = jk_fs.getRelativePath(this.outputDir, filePath);

        this.sourceCode_header += `\nimport c_${routeId} from "${distFilePath}";`;
        this.sourceCode_body += `\n    await routeBindPage(webSite, ${JSON.stringify(route)}, ${JSON.stringify(attributs)}, c_${routeId}, ${JSON.stringify(srcFilePath)});`
    }

    private bindVerb(verb: string, route: string, filePath: string, attributs: RouteAttributs) {
        let routeId = "r" + (this.routeCount++);
        let relPath = jk_fs.getRelativePath(this.outputDir, filePath);

        this.sourceCode_header += `\nimport f_${routeId} from "${relPath}";`;
        this.sourceCode_body += `\n    await routeBindVerb(webSite,  ${JSON.stringify(route)}, ${JSON.stringify(verb)}, ${JSON.stringify(attributs)}, f_${routeId});`
    }

    private async scanAttributs(dirPath: string): Promise<RouteAttributs> {
        let dirItems = await jk_fs.listDir(dirPath);
        let needRoles: Record<string, string[]>|undefined;
        const res: any = {};

        for (let dirItem of dirItems) {
            if (!dirItem.isFile) continue;
            if (dirItem.name[0] === '.') continue;

            let name = dirItem.name.toLowerCase();

            if (name.endsWith(".cond")) {
                let needRoleIdx = name.toLowerCase().indexOf("needrole");
                if (needRoleIdx===-1) continue;

                let target = name.substring(0, needRoleIdx).toUpperCase();
                let role = name.substring(needRoleIdx + 8).slice(0, -5).toLowerCase();
                if ((role[0]==='_')||(role[0]==='-')) role = role.substring(1);

                dirItem.fullPath = await useCanonicalFileName(dirItem.fullPath, target.toLowerCase() + "NeedRole_" + role + ".cond");
                await addNameIntoFile(dirItem.fullPath);

                if (!needRoles) {
                    needRoles = {};
                    res.needRoles = needRoles;
                }

                if (!needRoles[target]) needRoles[target] = [role];
                else needRoles[target].push(role);

            } else if (name==="cache.disable") {
                res.disableCache = true;
            } else if (name==="config.json") {
                let txt = await jk_fs.readTextFromFile(dirItem.fullPath);
                res.config = JSON.parse(txt);
            }
        }

        return res;
    }

    private async scanDir(dir: string, route: string, attributs: any) {
        let dirItems = await jk_fs.listDir(dir);

        for (let dirItem of dirItems) {
            if (dirItem.name[0] === '.') continue;

            if (dirItem.isDirectory) {
                attributs = await this.scanAttributs(dirItem.fullPath);

                let segment = convertRouteSegment(dirItem.name);
                let newRoute = route==="/" ? route + segment : route + "/" + segment;
                await this.scanDir(dirItem.fullPath, newRoute, attributs);
            } else if (dirItem.isFile) {
                let name = dirItem.name;

                if (name.endsWith(".tsx") || name.endsWith(".ts")) {
                    let idx = name.lastIndexOf(".");
                    name = name.substring(0, idx);

                    switch (name) {
                        case "index.page":
                            this.bindPage(route, dirItem.fullPath, attributs);
                            break;
                        case "onGET":
                            this.bindVerb("GET", route, dirItem.fullPath, attributs);
                            break;
                        case "onPOST":
                            this.bindVerb("POST", route, dirItem.fullPath, attributs);
                            break;
                        case "onPUT":
                            this.bindVerb("PUT", route, dirItem.fullPath, attributs);
                            break;
                        case "onDELETE":
                            this.bindVerb("DELETE", route, dirItem.fullPath, attributs);
                            break;
                        case "onHEAD":
                            this.bindVerb("HEAD", route, dirItem.fullPath, attributs);
                            break;
                        case "onOPTIONS":
                            this.bindVerb("OPTIONS", route, dirItem.fullPath, attributs);
                            break;
                    }
                }
            }
        }
    }
}

function convertRouteSegment(segment: string): string {
    if (segment.startsWith("[") && segment.endsWith("]")) {
        segment = segment.substring(1, segment.length - 1);
        return ":" + segment;
    }

    return segment;
}