import type {CoreServer, SseEvent, SseEventController, WebSocketConnectionInfos} from "../jopiServer.ts";
import type {HttpMethod, JopiWebSocket, WebSiteImpl, WebSiteRouteInfos} from "../jopiWebSite.ts";
import type {ServerInstanceBuilder} from "../serverInstanceBuilder.ts";
import React from "react";
import * as jk_fs from "jopi-toolkit/jk_fs";
import {getBundleDirPath} from "../bundler/common.ts";
import {isDevUiEnabled} from "jopi-rewrite/loader-client";

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
    private readonly isReactHmrEnabled: boolean;

    private readonly pageToBuild: Record<string, string> = {};

    constructor(private readonly webSite: WebSiteImpl) {
        this.isReactHmrEnabled = isDevUiEnabled();
    }

    addRoute(verb: HttpMethod, path: string, route: WebSiteRouteInfos) {
        if (!this.serverRoutes[path]) {
            this.serverRoutes[path] = {};
        }

        const webSite = this.webSite;

        this.serverRoutes[path][verb] = (req: Bun.BunRequest, server: Bun.Server<unknown>) => {
            return webSite.processRequest(route.handler, req.params, route, undefined, req, server);
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

    addPage(path: string, pageKey: string, reactComponent: React.FC<any>, routeInfos: WebSiteRouteInfos) {
        if (this.isReactHmrEnabled) {
            this.pageToBuild[path] = pageKey;
            return;
        }
        routeInfos.handler = async (req) => {
            return req.reactPage(pageKey, reactComponent);
        };

        routeInfos.handler = this.webSite.applyMiddlewares("GET", path, routeInfos.handler);
        this.addRoute("GET", path, routeInfos);
    }

    updateTlsCertificate(certificate: any) {
        this.serverOptions.tls = certificate;

        // Will reload without breaking the current connections.
        // @ts-ignore
        this.bunServer.reload(this.serverOptions);
    }

    async buildPage(path: string, pageKey: string): Promise<void> {
        const genDir = getBundleDirPath(this.webSite);
        const htmlFilePath = jk_fs.join(genDir, pageKey + ".html");

        if (!this.serverRoutes[path]) this.serverRoutes[path] = {};
        this.serverRoutes[path]["GET"] = (await import(htmlFilePath)).default;
    }

    async startServer(params: { port: number; tls: any }): Promise<CoreServer> {
        const options = {
            port: String(params.port),
            tls: params.tls,
            routes: this.serverRoutes,

            development: this.isReactHmrEnabled && {
                // Enable browser hot reloading in development
                hmr: true,
                // Echo console logs from the browser to the server
                console: true,
            }
        };

        for (let path in this.pageToBuild) {
            let pageKey = this.pageToBuild[path];
            await this.buildPage(path, pageKey);
        }

        this.serverOptions = options;

        return this.bunServer = Bun.serve(options);
    }
}

//endregion