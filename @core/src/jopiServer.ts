// noinspection JSUnusedGlobalSymbols

import {declareApplicationStopping as jlOnAppStopping, mustWaitServerReady} from "@jopi-loader/client";
import path from "node:path";

import fs from "node:fs/promises";
import {
    JopiWebSocket,
    ServerAlreadyStartedError,
    type SslCertificatePath,
    type WebSite,
    WebSiteImpl,
    type WebSiteMap
} from "./jopiWebSite.tsx";

import * as ns_app from "jopi-node-space/ns_app";
import * as ns_fs from "jopi-node-space/ns_fs";
import * as ns_os from "jopi-node-space/ns_os";
import {isBunJS} from "jopi-node-space/ns_what";

import bunJsServer from "./serverImpl/server_bunjs.js";
import nodeJsServer from "./serverImpl/server_nodejs.js";
import {getImportTransformConfig} from "@jopi-loader/tools";


class JopiServer {
    private readonly webSites: WebSiteMap = {};
    private readonly servers: ServerInstance[] = [];
    private _isStarted = false;

    addWebsite(webSite: WebSite): WebSite {
        if (this._isStarted) throw new ServerAlreadyStartedError();
        this.webSites[(webSite as WebSiteImpl).welcomeUrl] = webSite;
        return webSite;
    }

    async stopServer(): Promise<void> {
        if (!this._isStarted) return;

        // The socket for jopi loader.
        jlOnAppStopping();

        await Promise.all(this.servers.map(server => server.stop(false)));
    }

    async startServer() {
        if (this._isStarted) return;
        this._isStarted = true;

        /**
         * Allow avoiding a bug where returning an array with only one certificate throws an error.
         */
        function selectCertificate(certificates: any[]): any | any[] | undefined {
            if (certificates.length === 0) return undefined;
            if (certificates.length === 1) return certificates[0];
            return certificates;
        }

        const byPorts: { [port: number]: WebSiteMap } = {};

        // Check there is no mismatch between the config and the declarations.
        //
        let importTransformConfig = getImportTransformConfig();
        //
        if (importTransformConfig.webSiteUrl) {
            if (
                !importTransformConfig.webSiteListeningUrl ||
                (importTransformConfig.webSiteListeningUrl===importTransformConfig.webSiteUrl)
            ) {
                let origin = new URL(importTransformConfig.webSiteUrl).origin;

                if (!Object.keys(this.webSites).includes(origin)) {
                    throw new Error(`The default website "${importTransformConfig.webSiteUrl}" is not defined.
                Please add it to the server or update section jopi.defaultWebsite of your package.json file.`);
                }
            }
        }

        Object.values(this.webSites).forEach(e => {
            const webSite = e as WebSiteImpl;
            if (!byPorts[webSite.port]) byPorts[webSite.port] = {};
            byPorts[webSite.port][webSite.host] = e;
        });

        for (let port in byPorts) {
            function rebuildCertificates() {
                certificates = [];

                Object.values(hostNameMap).forEach(e => {
                    const webSite = e as WebSiteImpl;

                    if (webSite.certificate) {
                        const keyFile = path.resolve(webSite.certificate.key);
                        const certFile = path.resolve(webSite.certificate.cert);

                        certificates.push({
                            key: ns_fs.readTextSyncFromFile(keyFile),
                            cert: ns_fs.readTextSyncFromFile(certFile),
                            serverName: webSite.host
                        });
                    }
                });
            }

            const hostNameMap = byPorts[port]!;
            let certificates: any[] = [];

            rebuildCertificates();
            //
            Object.values(hostNameMap).forEach(webSite => (webSite as WebSiteImpl)._onRebuildCertificate = () => {
                rebuildCertificates();

                let certificate = selectCertificate(certificates);
                myServerOptions.tls = certificate;
                serverImpl.updateSslCertificate(myServerInstance, myServerOptions, certificate);
            });

            const myServerOptions: StartServerOptions = {
                ...gServerStartGlobalOptions,

                port,
                tls: selectCertificate(certificates),

                fetch: req => {
                    const urlInfos = new URL(req.url);
                    const webSite = hostNameMap[urlInfos.host];
                    if (!webSite) return new Response("", {status: 404});
                    return (webSite as WebSiteImpl).processRequest(urlInfos, req, myServerInstance);
                },

                async onWebSocketConnection(ws: WebSocket, infos: WebSocketConnectionInfos) {
                    const urlInfos = new URL(infos.url);
                    const webSite = hostNameMap[urlInfos.hostname];

                    if (!webSite) {
                        ws.close();
                        return;
                    }

                    const jws = new JopiWebSocket(webSite, myServerInstance, ws);
                    (webSite as WebSiteImpl).declareNewWebSocketConnection(jws, infos, urlInfos);
                }
            };

            await Promise.all(Object.values(hostNameMap).map(webSite => (webSite as WebSiteImpl).onBeforeServerStart()));

            const myServerInstance = serverImpl.startServer(myServerOptions);

            await Promise.all(Object.values(hostNameMap).map(webSite => (webSite as WebSiteImpl).onServerStarted()));
            this.servers.push(myServerInstance);
        }

        // Stop the server if the exit signal is received.
        ns_app.onAppExiting(() => {
            this.stopServer().catch();
        });
    }

    /**
     * Generate a certificat for dev test.
     * Require "mkcert" to be installed.
     * See: https://github.com/FiloSottile/mkcert
     */
    async createDevCertificate(hostName: string, certsDir: string = "certs"): Promise<SslCertificatePath> {
        const sslDirPath = path.resolve(certsDir, hostName);
        const keyFilePath = path.join(sslDirPath, "certificate.key");
        const certFilePath = path.join(sslDirPath, "certificate.crt.key");

        if (!await ns_fs.isFile(certFilePath)) {
            let mkCertToolPath = ns_os.whichSync("mkcert");

            if (mkCertToolPath) {
                await fs.mkdir(sslDirPath, {recursive: true});
                await ns_os.exec(`cd ${sslDirPath}; ${mkCertToolPath} -install; ${mkCertToolPath} --cert-file certificate.crt.key --key-file certificate.key ${hostName} localhost 127.0.0.1 ::1`);
            } else {
                throw "Can't generate certificate, mkcert tool not found. See here for installation: https://github.com/FiloSottile/mkcert";
            }
        }

        return {key: keyFilePath, cert: certFilePath};
    }
}

export function getServerStartOptions(): StartServerCoreOptions {
    return gServerStartGlobalOptions;
}

let gServerInstance: JopiServer|undefined;

export function getServer(): JopiServer {
    if (!gServerInstance) gServerInstance = new JopiServer();
    return gServerInstance;
}

const gServerStartGlobalOptions: StartServerCoreOptions = {};

export interface StartServerCoreOptions {
    /**
     * The timeout value for a request.
     * See: https://bun.sh/reference/bun/Server/timeout
     */
    timeout?: number;
}

export interface StartServerOptions extends StartServerCoreOptions {
    /**
     * The port to listen to.
     * The default is "3000".
     */
    port?: string;

    /**
     * The TLS certificate to use (for https).
     */
    tls?: TlsCertificate|TlsCertificate[],

    fetch: (req: Request) => Response|Promise<Response>;

    onWebSocketConnection?: (ws: WebSocket, infos: WebSocketConnectionInfos) => void;
}

export interface WebSocketConnectionInfos {
    headers: Headers;
    url: string;
}

export interface TlsCertificate {
    key: string;
    cert: string;
    serverName: string;
}

export interface ServerInstance {
    requestIP(req: Request): ServerSocketAddress|null;
    timeout(req: Request, seconds: number): void;
    stop(closeActiveConnections: boolean): Promise<void>;
}

export interface ServerSocketAddress {
    /**
     * The IP address of the client.
     */
    address: string;
    /**
     * The port of the client.
     */
    port: number;
    /**
     * The IP family ("IPv4" or "IPv6").
     */
    family: "IPv4" | "IPv6";
}

export interface ServerImpl {
    startServer(options: StartServerOptions): ServerInstance
    updateSslCertificate(server: ServerInstance, options: StartServerOptions, sslCertificate: any|any[]|undefined): void;
}

const serverImpl: ServerImpl = isBunJS ?  bunJsServer : nodeJsServer;

// In case we are using Jopi Loader (jopin).
//
// The load must not refresh the browser once this process is created but wait until we are ready.
// The main reason is that we create as JavaScript bundle that takes time to create, and the
// browser must not refresh too soon (event if it's only one second)
//
mustWaitServerReady();