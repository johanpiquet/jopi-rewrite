import {
    ArobaseType,
    CodeGenWriter,
    FilePart,
    getWriter,
    InstallFileType,
    PriorityLevel,
    resolveFile
} from "./engine.ts";
import * as jk_fs from "jopi-toolkit/jk_fs";
import * as jk_app from "jopi-toolkit/jk_app";
import type {RouteAttributs} from "jopi-rewrite/generated";

export default class TypeRoutes extends ArobaseType {
    private sourceCode_header = `import {routeBindPage, routeBindVerb} from "jopi-rewrite/generated";`;
    private sourceCode_body = "";
    private outputDir: string = "";
    private cwdDir: string = process.cwd();
    private routeCount: number = 1;

    private registry: Record<string, RegistryItem> = {};
    private routeConfig: Record<string, string> = {};

    async beginGeneratingCode(writer: CodeGenWriter): Promise<void> {
        for (let item of Object.values(this.registry)) {
            if (item.verb==="PAGE") {
                this.bindPage(item.route, item.filePath, item.attributs);
            } else {
                this.bindVerb(item.verb, item.route, item.filePath, item.attributs);
            }
        }

        if (Object.keys(this.routeConfig).length>0) {
            this.sourceCode_header += `\nimport {RouteConfig} from "jopi-rewrite";`;

            let count = 1;

            for (let route of Object.keys(this.routeConfig)) {
                let configFile = this.routeConfig[route];
                let relPath = jk_fs.getRelativePath(writer.dir.output_dir, configFile);

                this.sourceCode_header += `\nimport routeConfig${count} from "${relPath}";`;
                this.sourceCode_body += `\n    await routeConfig${count}(new RouteConfig(webSite, ${JSON.stringify(route)}));`;

                count++;
            }
        }

        this.sourceCode_body = `\n\nexport default async function(webSite) {${this.sourceCode_body}\n}`;

        let filePath = jk_fs.join(writer.dir.output_dir, "declareServerRoutes.js");
        await jk_fs.writeTextToFile(filePath, this.sourceCode_header + this.sourceCode_body);

        writer.genAddToInstallFile(InstallFileType.server, FilePart.imports, `\nimport declareRoutes from "./declareServerRoutes.js";`);
        writer.genAddToInstallFile(InstallFileType.server, FilePart.footer, "\n    onWebSiteCreated((webSite) => declareRoutes(webSite));");
    }

    async processDir(p: { moduleDir: string; arobaseDir: string; genDir: string; }) {
        this.outputDir = getWriter().dir.output_dir;

        let dirAttributs = await this.scanAttributs(p.arobaseDir);
        //
        if (dirAttributs.configFile) {
            this.routeConfig["/"] = dirAttributs.configFile;
        }

        await this.scanDir(p.arobaseDir, "/", dirAttributs);
    }

    private bindPage(route: string, filePath: string, attributs: RouteAttributs) {
        let routeId = "r" + (this.routeCount++);
        let srcFilePath = jk_fs.getRelativePath(this.cwdDir, filePath);

        filePath = jk_app.getCompiledFilePathFor(filePath);
        let distFilePath = jk_fs.getRelativePath(this.outputDir, filePath);

        let routeBindingParams = {route, attributs, filePath: srcFilePath};

        this.sourceCode_header += `\nimport c_${routeId} from "${distFilePath}";`;
        this.sourceCode_body += `\n    await routeBindPage(webSite, c_${routeId}, ${JSON.stringify(routeBindingParams)});`
    }

    private bindVerb(verb: string, route: string, filePath: string, attributs: RouteAttributs) {
        let routeId = "r" + (this.routeCount++);
        let relPath = jk_fs.getRelativePath(this.outputDir, filePath);

        let routeBindingParams = {verb, route, attributs, filePath};
        this.sourceCode_header += `\nimport f_${routeId} from "${relPath}";`;
        this.sourceCode_body += `\n    await routeBindVerb(webSite, f_${routeId}, ${JSON.stringify(routeBindingParams)});`
    }

    protected normalizeFeatureName(feature: string): string|undefined {
        if (feature==="cache") {
            return "cache";
        }

        feature = feature.replaceAll("-", "");
        feature = feature.replaceAll("_", "");

        if (feature==="autocache") {
            return "cache";
        }

        return undefined;
    }

    protected normalizeConditionName(condName: string, ctx: any|undefined): string|undefined {
        let needRoleIdx = condName.toLowerCase().indexOf("needrole");
        if (needRoleIdx===-1) return undefined;

        let target = condName.substring(0, needRoleIdx).toUpperCase();
        let role = condName.substring(needRoleIdx + 8).toLowerCase();
        if ((role[0]==='_')||(role[0]==='-')) role = role.substring(1);

        if (!ctx[target]) ctx[target] = [role];
        else ctx[target].push(role);

        target = target.toLowerCase();
        if (target==="page") target = "get";

        return target + "NeedRole_" + role;
    }

    private async scanAttributs(dirPath: string): Promise<RouteAttributs> {
        const res: RouteAttributs = {needRoles: {}};

        const infos = await this.dir_extractInfos(dirPath, {
            allowConditions: true,
            requirePriority: true,
            requireRefFile: false,
            conditionCheckingContext: res.needRoles
        });

        res.configFile = await resolveFile(dirPath, ["config.tsx", "config.ts"]);

        res.disableCache = (infos.features?.["cache"] === true) ? true : undefined;
        res.priority = infos.priority;

        if (!Object.values(res.needRoles!).length) {
            res.needRoles = undefined;
        }

        return res;
    }

    private addToRegistry(item: RegistryItem) {
        const key = item.route + ' ' + item.verb;
        let current = this.registry[key];

        if (!current) {
            this.registry[key] = item;
            return;
        }

        let newPriority = item.attributs.priority || PriorityLevel.default;
        let currentPriority = current.attributs.priority || PriorityLevel.default;

        if (newPriority>currentPriority) {
            this.registry[key] = item;
        }
    }

    private async scanDir(dir: string, route: string, attributs: RouteAttributs) {
        let dirItems = await jk_fs.listDir(dir);

        for (let dirItem of dirItems) {
            if (dirItem.name[0] === '.') continue;

            if (dirItem.isDirectory) {
                let segmentInfos = convertRouteSegment(dirItem.name);
                let newRoute = route==="/" ? route + segmentInfos.routePart : route + "/" + segmentInfos.routePart;
                let dirAttributs = await this.scanAttributs(dirItem.fullPath);

                if (segmentInfos.isCatchAll && segmentInfos.name) {
                    dirAttributs.catchAllSlug = segmentInfos.name;
                }

                if (dirAttributs.configFile) {
                    this.routeConfig[newRoute] = dirAttributs.configFile;
                }

                await this.scanDir(dirItem.fullPath, newRoute, dirAttributs);
            } else if (dirItem.isFile) {
                let name = dirItem.name;

                if (name.endsWith(".tsx") || name.endsWith(".ts")) {
                    let idx = name.lastIndexOf(".");
                    name = name.substring(0, idx);

                    switch (name) {
                        case "page":
                            this.addToRegistry({verb: "PAGE", route, filePath: dirItem.fullPath, attributs});
                            break;
                        case "onGET":
                            this.addToRegistry({verb: "GET", route, filePath: dirItem.fullPath, attributs});
                            break;
                        case "onPOST":
                            this.addToRegistry({verb: "POST", route, filePath: dirItem.fullPath, attributs});
                            break;
                        case "onPUT":
                            this.addToRegistry({verb: "PUT", route, filePath: dirItem.fullPath, attributs});
                            break;
                        case "onDELETE":
                            this.addToRegistry({verb: "DELETE", route, filePath: dirItem.fullPath, attributs});
                            break;
                        case "onHEAD":
                            this.addToRegistry({verb: "HEAD", route, filePath: dirItem.fullPath, attributs});
                            break;
                        case "onPATCH":
                            this.addToRegistry({verb: "PATCH", route, filePath: dirItem.fullPath, attributs});
                            break;
                        case "onOPTIONS":
                            this.addToRegistry({verb: "OPTIONS", route, filePath: dirItem.fullPath, attributs});
                            break;
                    }
                }
            }
        }
    }
}

interface RegistryItem {
    verb: string;
    route: string;
    filePath: string;
    attributs: RouteAttributs;
}

function convertRouteSegment(segment: string): {routePart: string, isCatchAll?: boolean, name?: string} {
    if (segment.startsWith("[") && segment.endsWith("]")) {
        segment = segment.substring(1, segment.length - 1);

        if (segment.startsWith("..")) {
            segment = segment.substring(2);
            while (segment[0]===".") segment=segment.substring(1);

            return {
                routePart: "**",
                isCatchAll: true,
                name: segment.length ? segment : undefined
            };
        }

        return {
            routePart: ":" + segment,
            isCatchAll: false,
            name: segment
        };
    }

    return {
        routePart: segment
    };
}