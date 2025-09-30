import {
    setDefaultPage404Template, setDefaultPage500Template, setDefaultPage401Template,
    type WebSite
} from "./jopiWebSite.tsx";
import path from "node:path";
import fs from "node:fs/promises";
import {pathToFileURL, fileURLToPath} from "node:url";
import {mustHydrate} from "jopi-rewrite-ui";
import {addGenerateScriptPlugin, getBrowserComponentKey} from "./hydrate.ts";
import {StaticRouter} from "react-router";
import {RouteContext_ExposePrivate} from "./routeContext.ts";
import {JopiRequest} from "./jopiRequest.ts";
import NodeSpace from "jopi-node-space";

const nFS = NodeSpace.fs;
const nApp = NodeSpace.app;

interface RouteInfo {
    componentKey: string;
    componentPath: string;
}

export class ReactRouterManager {
    private readonly routes: Record<string, RouteInfo> = {};
    private pageToPath: Record<string, string> = {};

    constructor(private readonly webSite: WebSite) {
        // Will allow adding content to the JavaScript file.
        // Here the goal of the script addon, is to bind the pages to ReactRouter.
        //
        addGenerateScriptPlugin((script, outDir) => this.scriptPlugin(script, outDir));
    }

    async initialize(routesDir: string = "routes") {
        await this.scanRoutesFrom(
            path.join(nApp.getSourceCodeDir(), routesDir)
        );
    }

    async scanRoutesFrom(dirToScan: string) {
        const scanRoutesFromAux = async (srcDirToScan: string, baseUrl: string, dstDirToCheck: string|undefined) => {
            const entries = await fs.readdir(srcDirToScan, {withFileTypes: true});
            const extension = ".tsx";

            for (const entry of entries) {
                let srcEntryFullPath = path.join(srcDirToScan, entry.name);
                let dstEntryFullPath = dstDirToCheck ? path.join(dstDirToCheck, entry.name) : undefined;

                if (entry.isDirectory()) {
                    await scanRoutesFromAux(srcEntryFullPath, baseUrl, dstEntryFullPath);
                } else if (entry.isFile()) {
                    if (entry.name.endsWith(".page" + extension)) {
                        let name = entry.name.slice(0, -(5 + extension.length));

                        // For Node.js, assert that the source file exists.
                        //
                        if (dstEntryFullPath) {
                            let idx = dstEntryFullPath.lastIndexOf(".");
                            dstEntryFullPath = dstEntryFullPath.substring(0, idx) + ".js";

                            if (!await nFS.isFile(dstEntryFullPath)) {
                                throw new Error("Source file has not been compiled: " + srcDirToScan);
                            }
                        }

                        let finalPath = srcEntryFullPath;

                        if (dstDirToCheck) {
                            finalPath = nApp.getCompiledFilePathFor(srcEntryFullPath);
                        }

                        // Calc the route of the page, something like "/product/listing".
                        //
                        srcEntryFullPath = path.resolve(srcEntryFullPath);
                        const fileRelPath = pathToFileURL(srcEntryFullPath).href.substring(baseUrl.length);
                        let idx = fileRelPath.lastIndexOf(".");
                        let route = fileRelPath.substring(0, idx);

                        // Register the page.
                        await this.registerPage(name, finalPath, pathToFileURL(finalPath).href, route);
                    }
                }
            }
        }

        let srcDirToScan: string;
        let distDirToScan: string;

        if (dirToScan.startsWith(nApp.getCompiledCodeDir())) {
            distDirToScan = dirToScan;
            srcDirToScan = path.join(nApp.getSourceCodeDir(), dirToScan.substring(nApp.getCompiledCodeDir().length));
        } else {
            srcDirToScan = dirToScan;
            distDirToScan = path.join(nApp.getCompiledCodeDir(), dirToScan.substring(nApp.getSourceCodeDir().length));
        }

        let isBunJS = NodeSpace.what.isBunJs;
        await scanRoutesFromAux(srcDirToScan, pathToFileURL(srcDirToScan).href, isBunJS ? undefined : distDirToScan);

        // Release memory.
        this.pageToPath = {};
    }

    private async scriptPlugin(script: string, _outDir: string) {
        let resolvedPath = import.meta.resolve("./../src/codeGen/template_router.jsx");
        resolvedPath = nFS.fileURLToPath(resolvedPath);
        let template = await nFS.readTextFromFile(resolvedPath);

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

    private async registerPage(name: string, fileFullPath: string, fileUrl: string, route: string) {
        if (this.pageToPath[name]) {
            console.error(`🚫 Page ${name} already declared at ${fileFullPath}`);
            process.exit(1);
        }

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
        if (!defaultValue) throw new Error("A default export is required. File: " + fileUrl);

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
            // console.log("Server: binding route", route);
            this.webSite.onGET(route, defaultHandler);
        }

        this.routes[route] = {
            componentKey: getBrowserComponentKey(fileFullPath),
            componentPath: fileFullPath
        };
    }
}