import {
    setDefaultPage404Template, setDefaultPage500Template, setDefaultPage401Template,
    type WebSite, type JopiRouteHandler
} from "./jopiWebSite.tsx";
import path from "node:path";
import fs from "node:fs/promises";
import {pathToFileURL} from "node:url";
import {mustHydrate} from "jopi-rewrite-ui";
import {addGenerateScriptPlugin, getBrowserComponentKey} from "./hydrate.ts";
import {StaticRouter} from "react-router";
import {JopiRequest} from "./jopiRequest.ts";
import NodeSpace from "jopi-node-space";
import {RouteContext_ExposePrivate} from "./routeContext.ts";
import React from "react";

const nFS = NodeSpace.fs;
const nApp = NodeSpace.app;

interface RouteInfo {
    componentKey: string;
    componentPath: string;
    component: React.FunctionComponent<any>;
}

export class ReactRouterManager {
    private readonly routes: Record<string, RouteInfo> = {};
    private pageToPath: Record<string, string> = {};
    private serverToPath: Record<string, string> = {};

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

            for (const entry of entries) {
                let srcEntryFullPath = path.join(srcDirToScan, entry.name);
                let dstEntryFullPath = dstDirToCheck ? path.join(dstDirToCheck, entry.name) : undefined;

                if (entry.isDirectory()) {
                    await scanRoutesFromAux(srcEntryFullPath, baseUrl, dstEntryFullPath);
                } else if (entry.isFile()) {
                    const isPage = entry.name.endsWith(".page.tsx");
                    const isServer = entry.name.endsWith(".server.tsx");

                    if (isPage || isServer) {
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
                        const idx = fileRelPath.lastIndexOf(".");
                        let route = fileRelPath.substring(0, idx);

                        if (route.endsWith("/index.page")) route = route.slice(0, -11);
                        else if (route.endsWith(".page")) route = route.slice(0, -5);
                        else if (route.endsWith("/index.server")) route = route.slice(0, -13);
                        else if (route.endsWith(".server")) route = route.slice(0, -7);
                        if (!route) route = "/";

                        // Register the route.
                        await this.registerRoute(isServer, finalPath, pathToFileURL(finalPath).href, route);
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

    private async registerRoute(isServer: boolean, fileFullPath: string, fileUrl: string, route: string) {
        if (isServer) {
            if (this.serverToPath[route]) {
                console.error(`🚫 Server route ${route} already declared. See: ${fileFullPath}`);
                process.exit(1);
            } else {
                this.serverToPath[route] = fileFullPath;
            }
        }
        else {
            if (this.pageToPath[route]) {
                console.error(`🚫 Page route ${route} already declared. See: ${fileFullPath}`);
                process.exit(1);
            } else {
                this.pageToPath[route] = fileFullPath;
            }
        }

        // Windows doesn't allow ":" in file name. So we use $ instead.
        route = route.replaceAll("/$", "/:");

        if (isServer) {
            let C: React.FunctionComponent<any>|undefined|null;

            const defaultHandler: JopiRouteHandler = async req => {
                if (!C) {
                    if (C === undefined) {
                        const r = this.routes[route];
                        if (r) C = r.component;
                        if (!C) C = null;
                    }

                    if (C === null) {
                        return req.returnError404_NotFound();
                    }
                }

                return req.reactResponse(<C />);
            };

            const sc = new RouteContext_ExposePrivate(this.webSite, fileUrl, route, defaultHandler);

            // Will call `await import(fileUrl)`
            //
            // Server auto-register himself his elements.
            // For a page, we need to do it ourselves.
            //
            await sc.initialize();
        }
        else
        {
            let isSpecialRoute = false;
            if (route==="/404") isSpecialRoute = true;
            else if (route==="/500") isSpecialRoute = true;
            else if (route==="/401") isSpecialRoute = true;

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
                } else if (route === "/500") {
                    setDefaultPage500Template(Cpn);
                    // No React Router support (it's server only).
                    return;
                } else if (route === "/401") {
                    setDefaultPage401Template(Cpn);
                    // No React Router support (it's server only).
                    return;
                }
            }

            // Avoid 404.
            let needGetHandler = route !== "*";

            const defaultHandler = async (req: JopiRequest) => {
                // The StaticRouter allows using Link in our components.
                return req.reactResponse(<StaticRouter location={req.webSite.getWelcomeUrl()}><Cpn/></StaticRouter>)
            };

            if (needGetHandler) {
                this.webSite.onGET(route, defaultHandler);
            }

            this.routes[route] = {
                componentKey: getBrowserComponentKey(fileFullPath),
                componentPath: fileFullPath,
                component: Cpn
            };
        }
    }
}