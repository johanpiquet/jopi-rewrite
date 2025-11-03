import {type WebSite} from "./jopiWebSite.tsx";
import path from "node:path";
import fs from "node:fs/promises";
import {pathToFileURL} from "node:url";
import * as jk_app from "jopi-toolkit/jk_app";
import * as jk_fs from "jopi-toolkit/jk_fs";
import {RouteServerContext_ExposePrivate} from "./routeServerContext.ts";
import {isBunJS} from "jopi-toolkit/jk_what";
import * as jk_events from "jopi-toolkit/jk_events";
import * as jk_crypto from "jopi-toolkit/jk_crypto";

export class RoutesManager {
    private routeToPagePath: Record<string, string> = {};
    private serverToPath: Record<string, string> = {};

    constructor(private readonly webSite: WebSite) {
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
                        await this.registerRoute(isServer, finalPath, srcEntryFullPath, pathToFileURL(finalPath).href, route);
                    }
                }
            }
        }

        let srcDirToScan: string;
        let distDirToScan: string;
        let distDir = jk_app.getCompiledCodeDir();
        let srcDir = jk_app.getSourceCodeDir();

        if (dirToScan.startsWith(distDir)) {
            distDirToScan = dirToScan;
            srcDirToScan = path.join(srcDir, dirToScan.substring(distDir.length));
        } else {
            srcDirToScan = dirToScan;
            distDirToScan = path.join(distDir, dirToScan.substring(srcDir.length));
        }

        await scanRoutesFromAux(srcDirToScan, pathToFileURL(srcDirToScan).href, isBunJS ? undefined : distDirToScan);

        // Release memory.
        this.routeToPagePath = {};
    }

    private async registerRoute(isServer: boolean, fileFullPath: string, fileSourceFullPath: string, fileUrl: string, route: string) {
        if (isServer) {
            if (this.serverToPath[route]) {
                console.error(`🚫 Server route ${route} already declared. See: ${fileFullPath}`);
                process.exit(1);
            } else {
                this.serverToPath[route] = fileFullPath;
            }
        }
        else {
            if (this.routeToPagePath[route]) {
                console.error(`🚫 Page route ${route} already declared. See: ${fileFullPath}`);
                process.exit(1);
            } else {
                this.routeToPagePath[route] = fileFullPath;
                await jk_events.sendAsyncEvent("jopi.route.newPage", {route, filePath: fileSourceFullPath});
            }
        }

        // Windows doesn't allow ":" in file name. So we use $ instead.
        route = route.replaceAll("/$", "/:");

        if (isServer) {
            const sc = new RouteServerContext_ExposePrivate(this.webSite, fileUrl, route);

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
            let routes: string[] = [route];

            const reactComponent = mod.default;
            if (!reactComponent) throw new Error("A default export is required. File: " + fileUrl);

            if (isSpecialRoute) {
                if (route === "/error404") {
                    routes.push("/not-found");
                } else if (route === "/error500") {
                    routes.push("/error");
                } else if (route === "/error401") {
                    // Will allows the router to redirect
                    // to one of these pages if a user is not authorized.
                    //
                    routes.push("/not-authorized");
                }
            }

            const pageKey = "page_" + jk_crypto.fastHash(route);

            for (let route of routes) {
                this.webSite.onPage(route, pageKey, reactComponent);
            }
        }
    }
}