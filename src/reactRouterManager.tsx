import {
    setDefaultPage404Template, setDefaultPage500Template, setDefaultPage401Template,
    type WebSite
} from "./jopiWebSite.tsx";
import path from "node:path";
import fss from "node:fs";
import fs from "node:fs/promises";
import {pathToFileURL, fileURLToPath} from "node:url";
import {mustHydrate} from "jopi-rewrite-ui";
import {addGenerateScriptPlugin, getBrowserComponentKey} from "./hydrate.ts";
import {StaticRouter} from "react-router";
import {RouteContext_ExposePrivate} from "./routeContext.ts";
import {JopiRequest} from "./jopiRequest.js";

const nFS = NodeSpace.fs;

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
        let resolvedPath = import.meta.resolve("./../src/codeGen/template_router.jsx");
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
        const scanForPageFiles = async (dirToScan: string, rootDirUrl: string, checkPath: string|undefined) => {
            const entries = await fs.readdir(dirToScan, {withFileTypes: true});

            for (const entry of entries) {
                let fullPath = path.join(dirToScan, entry.name);
                let cFullPath = checkPath ? path.join(checkPath, entry.name) : undefined;

                if (entry.isDirectory()) {
                    await scanForPageFiles(fullPath, rootDirUrl, cFullPath);
                } else if (entry.isFile()) {
                    if (entry.name.endsWith(".page" + extension)) {
                        let name = entry.name.slice(0, -(5 + extension.length));

                        if (cFullPath) {
                            cFullPath = cFullPath.slice(0, -3) + ".tsx";

                            // For node.js, assert that the source file exists.
                            // It's required because the dist directory can have garbage files.
                            if (!await nFS.isFile(cFullPath)) {
                                continue;
                            }
                        }

                        fullPath = path.resolve(fullPath);
                        const fileUrl = pathToFileURL(fullPath).href;
                        const fileRelPath = fileUrl.substring(rootDirUrl.length);
                        await this.registerPage(name, fullPath, fileUrl, fileRelPath.slice(0, -extension.length));
                    }
                }
            }
        }

        let isBunJS = NodeSpace.what.isBunJs;

        const extension = isBunJS ? ".tsx" : ".js";

        let pkgJsonFilePath = findPackageJson(this.dirHint);
        if (!pkgJsonFilePath) throw "React Router - Can't find package.json file";

        const pkgJsonDir = path.dirname(pkgJsonFilePath);

        let distDir = path.join(pkgJsonDir, "dist", "reactPages");
        let srcDir = path.join(pkgJsonDir, "src", "reactPages");

        if (!await NodeSpace.fs.isDirectory(srcDir)) {
            throw "React router - Directory not found: " + srcDir;
        }

        if (!isBunJS) {
            if (!await NodeSpace.fs.isDirectory(distDir)) {
                throw "React router - Directory not found: " + distDir;
            }
        }

        let mainDir = isBunJS ? srcDir : distDir;

        await scanForPageFiles(mainDir, pathToFileURL(mainDir).href, isBunJS ? undefined : srcDir);

        // Release memory.
        this.pageToPath = {};
    }

    private pageToPath: Record<string, string> = {};

    private async registerPage(name:  string, fileFullPath: string, fileUrl: string, route: string) {
        if (this.pageToPath[name]) {
            console.error(`🚫 Page ${name} already declared at ${fileFullPath}`);
            process.exit(1);
        }

        console.log("🔥  Registering page", name);

        let serverUrlParts = fileUrl.split("/");
        serverUrlParts.push(serverUrlParts.pop()!.replace("page", "server"));
        let serverUrl = serverUrlParts.join("/");
        let serverFilePath = fileURLToPath(serverUrl);
        //
        let isServerFileFound = await nFS.isFile(serverFilePath);

        let isSpecialRoute = false;

        // Windows doesn't allow ":" in file name. So we use $ instead.
        route = route.replaceAll("/$", "/:");

        if (route.endsWith(".page")) {
            route = route.slice(0, -5);
        }

        if (route==="/404") {
            isSpecialRoute = true;
        }
        else if (route==="/500") {
            isSpecialRoute = true;
        }
        else if (route==="/401") {
            isSpecialRoute = true;
        }
        else {
            if (name==="index") {
                // Remove the /index at end.
                route = route.substring(0, route.lastIndexOf("/")) || "/";
            }
        }

        // Note: React Router doesn't support cath-all.
        //       The only catch mechanism is for 404 support.

        let mod = await import(fileUrl);
        const defaultValue = mod.default;
        if (!defaultValue) throw "A default export is required. File: " + fileUrl;

        let Cpn = mustHydrate({filename: fileFullPath}, defaultValue);

        if (isSpecialRoute) {
            if (route === "/404") {
                // Set the 404 template for the website.
                setDefaultPage404Template(Cpn);

                // For React Router.
                route = "*";
            } else if (route==="/500") {
                setDefaultPage500Template(Cpn);
                // No React Router support (it's server only).
                return;
            } else if (route==="/401") {
                setDefaultPage401Template(Cpn);
                // No React Router support (it's server only).
                return;
            }
        }

        //console.log("Mapping route", route, "to", fileFullPath);

        // Avoid 404.
        let needGetHandler = route !== "*";

        const defaultHandler = async (req: JopiRequest) => {
            // The StaticRouter allows using Link in our components.
            return req.reactResponse(<StaticRouter location={req.webSite.getWelcomeUrl()}><Cpn/></StaticRouter>)
        };

        if (isServerFileFound && !isSpecialRoute) {
            const sc = new RouteContext_ExposePrivate(this.webSite, serverFilePath, route, defaultHandler);
            await sc.initialize();
            needGetHandler = !sc.hasGetHandler();
        }

        if (needGetHandler) {
            console.log("Server: binding route", route);
            this.webSite.onGET(route, defaultHandler);
        }

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