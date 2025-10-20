import {
    setDefaultPage404Template, setDefaultPage500Template, setDefaultPage401Template,
    type WebSite, type JopiRouteHandler
} from "./jopiWebSite.tsx";
import path from "node:path";
import fs from "node:fs/promises";
import {pathToFileURL} from "node:url";
import {mustHydrate} from "jopi-rewrite/ui";
import {getBrowserComponentKey} from "./hydrate.ts";
import {StaticRouter} from "react-router";
import {JopiRequest} from "./jopiRequest.ts";
import * as jk_app from "jopi-toolkit/jk_app";
import * as jk_fs from "jopi-toolkit/jk_fs";
import {RouteServerContext_ExposePrivate} from "./routeServerContext.ts";
import React from "react";
import {addGenerateScriptPlugin, loadCodeGenTemplate} from "./bundler/scripts.ts";
import {isBunJS} from "jopi-toolkit/jk_what";
import {getBundlerConfig} from "./bundler/config.ts";

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
            path.join(jk_app.getSourceCodeDir(), routesDir)
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

                            if (!await jk_fs.isFile(dstEntryFullPath)) {
                                throw new Error("No compiled file found for: " + srcDirToScan + "\nExpected: " + dstEntryFullPath);
                            }
                        }

                        let finalPath = srcEntryFullPath;

                        if (dstDirToCheck) {
                            finalPath = jk_app.getCompiledFilePathFor(srcEntryFullPath);
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

        if (dirToScan.startsWith(jk_app.getCompiledCodeDir())) {
            distDirToScan = dirToScan;
            srcDirToScan = path.join(jk_app.getSourceCodeDir(), dirToScan.substring(jk_app.getCompiledCodeDir().length));
        } else {
            srcDirToScan = dirToScan;
            distDirToScan = path.join(jk_app.getCompiledCodeDir(), dirToScan.substring(jk_app.getSourceCodeDir().length));
        }

        await scanRoutesFromAux(srcDirToScan, pathToFileURL(srcDirToScan).href, isBunJS ? undefined : distDirToScan);

        // Release memory.
        this.pageToPath = {};
    }

    private async scriptPlugin(script: string, _outDir: string) {
        const config = getBundlerConfig();
        let enableReactRouter = config.reactRouter.disable!==true;
        if (!enableReactRouter) return "";

        let template = await loadCodeGenTemplate("template_router.jsx");
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

        template = template.replace("//[ROUTES]", JSON.stringify(reactRoutes, null, 4));

        return script + template;
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

        let routes: string[] = [];

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

            const sc = new RouteServerContext_ExposePrivate(this.webSite, fileUrl, route, defaultHandler);

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
            if (route==="/error404") isSpecialRoute = true;
            else if (route==="/error500") isSpecialRoute = true;
            else if (route==="/error401") isSpecialRoute = true;

            // Note: React Router doesn't support cath-all.
            //       The only catch mechanism is for 404 support.

            let mod = await import(fileUrl);

            const defaultValue = mod.default;
            if (!defaultValue) throw new Error("A default export is required. File: " + fileUrl);

            let Cpn = mustHydrate({filename: fileFullPath}, defaultValue);

            if (isSpecialRoute) {
                if (route === "/error404") {
                    // Set the 404 template for the website.
                    setDefaultPage404Template(Cpn);

                    routes.push("/error404");
                    routes.push("/not-found");
                } else if (route === "/error500") {
                    setDefaultPage500Template(Cpn);

                    routes.push("/error500");
                    routes.push("/error");
                } else if (route === "/error401") {
                    setDefaultPage401Template(Cpn);

                    // Will allows the router to redirect
                    // to one of these pages if a user is not authorized.
                    //
                    routes.push("/error401");
                    routes.push("/not-authorized");
                }
            } else {
                routes.push(route);
            }

            const defaultHandler = async (req: JopiRequest) => {
                // The StaticRouter allows using Link in our components.
                return req.reactResponse(<StaticRouter location={req.webSite.getWelcomeUrl()}><Cpn/></StaticRouter>)
            };

            for (const r of routes) {
                this.webSite.onGET(r, defaultHandler);

                this.routes[r] = {
                    componentKey: getBrowserComponentKey(fileFullPath),
                    componentPath: fileFullPath,
                    component: Cpn
                };
            }
        }
    }
}