import {setDefaultPage404Template, setDefaultPage500Template, setDefaultPage401Template,
    type WebSite} from "./core.js";
import path from "node:path";
import fss from "node:fs";
import fs from "node:fs/promises";
import {pathToFileURL} from "node:url";
import {mustHydrate} from "jopi-rewrite-ui";
import {addGenerateScriptPlugin, getBrowserComponentKey} from "./hydrate.js";
import {StaticRouter} from "react-router";

interface RouteInfo {
    componentKey: string;
    componentPath: string;
}

export class ReactRouterManager {
    private readonly routes: Record<string, RouteInfo> = {};

    constructor(private readonly webSite: WebSite, private readonly dirHint: string) {
    }

    async initialize() {
        addGenerateScriptPlugin((script, outDir) => this.scriptPlugin(script, outDir));
        await this.scanPages();
    }

    private async scriptPlugin(script: string, _outDir: string) {
        let resolvedPath = import.meta.resolve("./../src/template_router.jsx");
        resolvedPath = NodeSpace.fs.fileURLToPath(resolvedPath);
        let template = await NodeSpace.fs.readTextFromFile(resolvedPath);

        let reactRoutes: any[] = [];

        for (let route in this.routes) {
            if (route==="*") {
                continue;
            }

            reactRoutes.push({
                path: route,
                Component: this.routes[route].componentKey
            });
        }

        if (this.routes["*"]) {
            reactRoutes.push({
                path: "*",
                Component: this.routes["*"].componentKey
            });
        }

        template = template.replace("//[ROUTES]", JSON.stringify(reactRoutes));

        script += template;
        return script;
    }

    private async scanPages() {
        const scanForPageFiles = async (dirToScan: string, rootDirUrl: string) => {
            const entries = await fs.readdir(dirToScan, {withFileTypes: true});

            for (const entry of entries) {
                let fullPath = path.join(dirToScan, entry.name);

                if (entry.isDirectory()) {
                    await scanForPageFiles(fullPath, rootDirUrl);
                } else if (entry.isFile()) {
                    if (entry.name.endsWith(".page.js")) {
                        fullPath = path.resolve(fullPath);
                        const fileUrl = pathToFileURL(fullPath).href;
                        const fileRelPath = fileUrl.substring(rootDirUrl.length);
                        await this.registerPage(fullPath, fileUrl, fileRelPath);
                    }
                }
            }
        }

        let pkgJsonFilePath = findPackageJson(this.dirHint);
        if (!pkgJsonFilePath) throw "React Router - Can't find package.json file";

        const pkgJsonDir = path.dirname(pkgJsonFilePath);

        if (NodeSpace.what.isNodeJS) {
            let outDir = path.join(pkgJsonDir, "dist", "reactPages")

            if (!await NodeSpace.fs.isDirectory(outDir)) {
                throw "React router - Directory not found: " + outDir;
            }

            await scanForPageFiles(outDir, pathToFileURL(outDir).href);
        } else {
            throw new Error("TODO: bun.js support");
        }
    }

    private async registerPage(fileFullPath: string, fileUrl: string, linuxRelPath: string) {
        let isSpecialRoute = false;
        let route;

        if (linuxRelPath==="/%5B404%5D.page.js") {
            isSpecialRoute = true;
            route = "*";
        }
        else if (linuxRelPath==="/%5B500%5D.page.js") {
            isSpecialRoute = true;
            route = "500";
        }
        else if (linuxRelPath==="/%5B401%5D.page.js") {
            isSpecialRoute = true;
            route = "401";
        }
        else {
            route = linuxRelPath.substring(0, linuxRelPath.lastIndexOf("/")) || "/";
        }

        // Note 1: React Router doesn't support cath-all.
        //         The only mechanism is for 404 support.

        let mod = await import(fileUrl);
        const defaultValue = mod.default;
        if (!defaultValue) throw "A default export is required. File: " + fileUrl;

        let Cpn = mustHydrate({filename: fileFullPath}, defaultValue);

        if (isSpecialRoute) {
            if (route === "*") {
                // Set the 404 template for the website.
                setDefaultPage404Template(Cpn);
            } else if (route==="500") {
                setDefaultPage500Template(Cpn);
                return;
            } else if (route==="401") {
                setDefaultPage401Template(Cpn);
                return;
            }
        }

        console.log("Mapping route", route, "to", fileFullPath);

        this.webSite.onGET(route, async req => {
            // The StaticRouter allows using Link in our components.
            return req.reactResponse(<StaticRouter location={req.url}><Cpn /></StaticRouter>)
        });

        this.routes[route] = {
            componentKey: getBrowserComponentKey(fileFullPath),
            componentPath: fileFullPath
        };
    }
}

function findPackageJson(currentDir: string): string|null {
    while (true) {
        const packagePath = path.join(currentDir, 'package.json');

        if (fss.existsSync(packagePath)) {
            return packagePath;
        }

        const parentDir = path.dirname(currentDir);

        // Reached root directory
        if (parentDir === currentDir) break;

        currentDir = parentDir;
    }

    return null;
}