import {addNameIntoFile, ArobaseType, CodeGenWriter, FilePart, getWriter, InstallFileType} from "./engine.ts";
import * as jk_fs from "jopi-toolkit/jk_fs";
import type {RouteAttributs} from "jopi-rewrite/generated";

export default class TypeRoutes extends ArobaseType {
    private sourceCode_header = `import {routeBindPage, routeBindVerb} from "jopi-rewrite/generated";`;
    private sourceCode_body = ``;
    private outputDir: string = "";
    private cwdDir: string = process.cwd();
    private routeCount: number = 1;

    async beginGeneratingCode(writer: CodeGenWriter): Promise<void> {
        this.sourceCode_body = `\n\nexport default async function(registry) {${this.sourceCode_body}\n}`;

        let filePath = jk_fs.join(writer.dir.output_src, "declareServerRoutes.js");
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
        let relPath_output = jk_fs.getRelativePath(this.outputDir, filePath);
        let relPath_cwd = jk_fs.getRelativePath(this.cwdDir, filePath);

        attributs = filterRoles(attributs, "page");

        this.sourceCode_header += `\nimport c_${routeId} from "${relPath_output}";`;
        this.sourceCode_body += `\n    await routeBindPage(registry, ${JSON.stringify(route)}, ${JSON.stringify(attributs)}, c_${routeId}, ${JSON.stringify(relPath_cwd)});`
    }

    private bindVerb(verb: string, route: string, filePath: string, attributs: RouteAttributs) {
        let routeId = "r" + (this.routeCount++);
        let relPath = jk_fs.getRelativePath(this.outputDir, filePath);

        attributs = filterRoles(attributs, verb.toLowerCase());

        this.sourceCode_header += `\nimport f_${routeId} from "${relPath}";`;
        this.sourceCode_body += `\n    await routeBindVerb(registry,  ${JSON.stringify(route)}, ${JSON.stringify(verb)}, ${JSON.stringify(attributs)}, f_${routeId});`
    }

    private async scanAttributs(dirPath: string): Promise<RouteAttributs> {
        let dirItems = await jk_fs.listDir(dirPath);
        let needRoles: string[]|undefined;
        const res: any = {};

        for (let dirItem of dirItems) {
            if (!dirItem.isFile) continue;
            if (dirItem.name[0] === '.') continue;

            let name = dirItem.name.toLowerCase();

            if (name.endsWith(".role")) {
                await addNameIntoFile(dirItem.fullPath);

                name = name.replace("-", "");
                name = name.replace("_", "");

                let role = name.substring(0, name.length - 5).toLowerCase();

                if (!needRoles) {
                    needRoles = [];
                    res.needRoles = needRoles;
                }

                needRoles.push(role);
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

function filterRoles(attributs: RouteAttributs, filterTarget: string): RouteAttributs {
    let needRoles = attributs.needRoles;
    if (!needRoles) return attributs;

    let roles: string[]|undefined;

    needRoles.forEach(r => {
        let idx = r.indexOf(".");
        if (idx===-1) {
            if (!roles) roles = [];
            roles.push(r);
            return;
        }

        let target = r.substring(idx+1);
        let role = r.substring(0, idx);

        if (target===filterTarget) {
            if (!roles) roles = [];
            roles.push(role);
        }
    });

    return {
        ...attributs,
        needRoles: roles
    };
}

function convertRouteSegment(segment: string): string {
    if (segment.startsWith("[") && segment.endsWith("]")) {
        segment = segment.substring(1, segment.length - 1);
        return ":" + segment;
    }

    return segment;
}