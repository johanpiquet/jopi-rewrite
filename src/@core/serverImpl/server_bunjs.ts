import type {CoreServer, SseEvent, SseEventController, WebSocketConnectionInfos} from "../jopiServer.ts";
import type {HttpMethod, JopiWebSocket, WebSiteImpl, WebSiteRouteInfos} from "../jopiWebSite.ts";
import type {ServerInstanceBuilder} from "../serverInstanceBuilder.ts";
import React from "react";
import {isProduction} from "jopi-toolkit/jk_process";
import * as jk_fs from "jopi-toolkit/jk_fs";
import {getBundleDirPath} from "../bundler/common.ts";
import {JopiRequest} from "../jopiRequest";

/*interface WebSocketData {
    url?: string,
    headers?: Headers,

    onMessage?: (msg: string|Buffer) => void
    onClosed?: (code: number, reason: string) => void
}*/

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

    startServer(params: { port: number; tls: any }): CoreServer {
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

        this.serverOptions = options;

        return this.bunServer = Bun.serve(options);
    }

    updateTlsCertificate(certificate: any) {
        this.serverOptions.tls = certificate;

        // Will reload without breaking the current connections.
        // @ts-ignore
        this.bunServer.reload(this.serverOptions);
    }

    addPage(path: string, pageKey: string, _sourceFilePath: string, reactComponent: React.FC<any>, routeInfos: WebSiteRouteInfos): void {
        if (isProduction) {
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

            // Note: the HTML already include the specific CSS and JS for this page.
            let htmlText = req.renderPageToHtml(pageKey, reactComponent);
            htmlText = htmlText.replaceAll("/_bundle/" + pageKey, this.webSite.welcomeUrl + "/_bundle/" + pageKey);

            await jk_fs.writeTextToFile(htmlFilePath, htmlText);

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