import type {CoreServer, SseEvent, SseEventController, WebSocketConnectionInfos} from "../jopiServer.ts";
import type {HttpMethod, JopiWebSocket, WebSiteImpl, WebSiteRouteInfos} from "../jopiWebSite.ts";
import type {ServerInstanceBuilder} from "../serverInstanceBuilder.ts";
import React from "react";
import * as jk_fs from "jopi-toolkit/jk_fs";
import {getBundleDirPath} from "../bundler/common.ts";
import {JopiRequest} from "../jopiRequest.tsx";
import type {PageOptions} from "jopi-rewrite/ui";

import testPageHMR from "/Users/johan/Projets/jopi-rewrite-workspace/__packages/jopi-rewrite/src/@core/serverImpl/testPage/index.html";

//region SSE Events

interface SseClient {
    controller: ReadableStreamDefaultController,
    me: any
}

interface BunSseEvent extends SseEvent {
    clients: SseClient[];
}

export async function onSseEvent(sseEvent: SseEvent): Promise<Response> {
    // Serve a reference for this client.
    // To know: stream can't be used because it's not initialized yet.
    const me = {};

    const stream = new ReadableStream({
        start(controller) {
            const nodeSseEvent = sseEvent as BunSseEvent;

            if (!nodeSseEvent.clients) {
                nodeSseEvent.clients = [];

                let controller: SseEventController = {
                    send(eventName: string, data: string) {
                        let toSend = `event: ${eventName}\ndata: ${ JSON.stringify({message: data}) }\n\n`;
                        const encoder = new TextEncoder();
                        const encodedData = encoder.encode(toSend);
                        nodeSseEvent.clients.forEach(e => { e.controller.enqueue(encodedData); });
                        console.log("sse - sending to",  nodeSseEvent.clients.length, "clients")
                    },

                    close() {
                        nodeSseEvent.clients.forEach(e => {
                            e.controller.close();
                        });

                        nodeSseEvent.clients = [];
                    }
                }

                nodeSseEvent.handler(controller);
            }

            nodeSseEvent.clients.push({controller, me});

            const initialData = sseEvent.getWelcomeMessage();

            const encoder = new TextEncoder();
            controller.enqueue(encoder.encode(`data: ${initialData}\n\n`));
        },

        cancel() {
            const nodeSseEvent = sseEvent as BunSseEvent;
            nodeSseEvent.clients = nodeSseEvent.clients.filter(e => e.me !== me);
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        }
    });
}

//endregion

//region ServerInstanceProvider


export class BunJsServerInstanceBuilder implements ServerInstanceBuilder {
    private bunServer?: Bun.Server<unknown>;
    private serverOptions?: any;
    private serverRoutes: any = {};

    private readonly pageToBuild: Record<string, string> = {};

    constructor(private readonly webSite: WebSiteImpl) {
    }

    addRoute(verb: HttpMethod, path: string, route: WebSiteRouteInfos) {
        if (!this.serverRoutes[path]) {
            this.serverRoutes[path] = {};
        }

        const webSite = this.webSite;

        this.serverRoutes[path][verb] = (req: Request, urlParts: any) => {
            return webSite.processRequest(route.handler, urlParts, route, undefined, req, this.bunServer!);
        }
    }

    addWsRoute(path: string, handler: (ws: JopiWebSocket, infos: WebSocketConnectionInfos) => void) {
        //TODO
    }

    addSseEVent(path: string, handler: SseEvent): void {
        handler = {...handler};

        this.addRoute("GET", path, {
            handler: async _ => {
                return onSseEvent(handler);
            }
        });
    }

    async startServer(params: { port: number; tls: any }): Promise<CoreServer> {
        const options = {
            port: String(params.port),
            tls: params.tls,
            routes: this.serverRoutes,

            development: process.env.NODE_ENV !== "production" && {
                // Enable browser hot reloading in development
                hmr: true,
                // Echo console logs from the browser to the server
                console: true,
            }
        };
        await this.patchTest(options);

        for (let path in this.pageToBuild) {
            let pageKey = this.pageToBuild[path];
            await this.buildPage(path, pageKey);
        }

        this.serverOptions = options;

        return this.bunServer = Bun.serve(options);
    }

    updateTlsCertificate(certificate: any) {
        this.serverOptions.tls = certificate;

        // Will reload without breaking the current connections.
        // @ts-ignore
        this.bunServer.reload(this.serverOptions);
    }

    async addPage(path: string, pageKey: string, _sourceFilePath: string, reactComponent: React.FC<any>, routeInfos: WebSiteRouteInfos): Promise<void> {
        this.pageToBuild[path] = pageKey;
    }

    async buildPage(path: string, pageKey: string): Promise<void> {
        const genDir = getBundleDirPath(this.webSite);
        const htmlFilePath = jk_fs.join(genDir, pageKey + ".html");

        if (!this.serverRoutes[path]) this.serverRoutes[path] = {};
        this.serverRoutes[path]["GET"] = (await import(htmlFilePath)).default;
    }

    async addPage2(path: string, pageKey: string, _sourceFilePath: string, reactComponent: React.FC<any>, routeInfos: WebSiteRouteInfos): Promise<void> {
        const genDir = getBundleDirPath(this.webSite);
        const htmlFilePath = jk_fs.join(genDir, pageKey + ".html");

        if (!this.serverRoutes[path]) {
            this.serverRoutes[path] = {};
        }

        this.serverRoutes[path]["GET"] = async (coreRequest: Request, urlParts: any) => {
            this.serverRoutes[path]["GET"] = (await import(htmlFilePath)).default;

            setTimeout(() => {
                this.bunServer!.reload(this.serverOptions);
            }, 0);

            return new Response("Dev mode - waiting ...", {
                status: 200,
                headers: {
                    "Refresh": "0",
                    "Content-Type": "text/html;charset=utf-8"
                }
            });
        }
    }

    async patchTest(options: any) {
        options.routes["/hmr"] = {
            "GET": (await import("/Users/johan/Projets/jopi-rewrite-workspace/__packages/jopi-rewrite/src/@core/serverImpl/testPage/index.html")).default
        };
    }

    async addPage_full(path: string, pageKey: string, _sourceFilePath: string, reactComponent: React.FC<any>, routeInfos: WebSiteRouteInfos): Promise<void> {
        if (process.env.JOPI_DEV_UI !== "1") {
            routeInfos.handler = async (req) => {
                return req.reactPage(pageKey, reactComponent);
            };

            this.addRoute("GET", path, routeInfos)
            return;
        }

        const genDir = getBundleDirPath(this.webSite);
        const htmlFilePath = jk_fs.join(genDir, "out", pageKey + ".html");

        if (!this.serverRoutes[path]) {
            this.serverRoutes[path] = {};
        }

        this.serverRoutes[path]["GET"] = async (coreRequest: Request, urlParts: any) => {
            const req = new JopiRequest(this.webSite, undefined, coreRequest, this.bunServer!, routeInfos);

            // > Step 1: create / update the page on disk.

            // Here we work with a relatif path.
            let options: PageOptions = {
                head: [<link key="jopi.mainBundle" rel="stylesheet" type="text/css" href={"./_bundle/" + pageKey + ".css"} />],
                bodyEnd: [<script key="jopi.mainSript" type="module" src={"./_bundle/" + pageKey + ".js"}></script>]
            };

            // Note: the HTML already include the specific CSS and JS for this page.
            let htmlText = req.renderPageToHtml(pageKey, reactComponent, options);
            //htmlText = htmlText.replaceAll("/_bundle/" + pageKey, this.webSite.welcomeUrl + "/_bundle/" + pageKey);

            await jk_fs.writeTextToFile(htmlFilePath, htmlText);
            console.log("Page updated:", htmlFilePath);

            // Step 2: import and return the file.

            this.serverRoutes[path]["GET"] = (await import(htmlFilePath)).default;

            setTimeout(() => {
                this.bunServer!.reload(this.serverOptions);
            }, 0);

            // Will force reloading the page.
            // Work well here. If ko, the matter is not the reload, but the server.
            return new Response("Reload...", {
                status: 200,
                headers: {
                "Refresh": "0",
                "Content-Type": "text/html;charset=utf-8"
                }
            });
        }
    }
}

//endregion