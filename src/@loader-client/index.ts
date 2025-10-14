import {readFileSync} from "node:fs";
import process from 'node:process';
import * as ns_webSocket from "jopi-node-space/ns_webSocket";
import * as ns_app from "jopi-node-space/ns_app";
import * as ns_fs from "jopi-node-space/ns_fs";


let gIsBrowserRefreshEnabled: boolean|undefined;
let gWebSocketUrl: string|undefined;
let gRefreshHtmlSnippet: string|undefined;
let gWebSocket: WebSocket|undefined;

export function isBrowserRefreshEnabled(): boolean {
    if (gIsBrowserRefreshEnabled===undefined) {
        gIsBrowserRefreshEnabled = process.env.JOPIN_BROWSER_REFRESH_ENABLED === '1';
    }

    return gIsBrowserRefreshEnabled!;
}

function getWebSocketUrl(): string {
    if (gWebSocketUrl===undefined) {
        gWebSocketUrl = process.env.JOPIN_WEBSOCKET_URL;
    }

    return gWebSocketUrl!;
}

async function getWebSocket(): Promise<WebSocket> {
    if (gWebSocket) return gWebSocket;

    gWebSocket = await ns_webSocket.openConnection(getWebSocketUrl());
    return gWebSocket;
}

export function declareApplicationStopping() {
    if (gWebSocket) {
        gWebSocket.close();
    }
}

export function getBrowserRefreshHtmlSnippet() {
    if (gRefreshHtmlSnippet) return gRefreshHtmlSnippet;

    let filePath = ns_fs.join(ns_app.findPackageJsonDir(import.meta.dirname), "src", "@loader-client", "deps", "browserRefreshScript.js");
    let scriptFile = readFileSync(filePath, "utf8");

    scriptFile = scriptFile.replaceAll("JOPIN_WEBSOCKET_URL", getWebSocketUrl());
    scriptFile = scriptFile.replace("export {};", "");

    gRefreshHtmlSnippet = `<script type="text/javascript">${scriptFile}</script>`;

    return gRefreshHtmlSnippet;
}

export function mustWaitServerReady() {
    if (!isBrowserRefreshEnabled()) return;

    getWebSocket().then((ws) => {
        ns_webSocket.sendMessage(ws, "mustWaitServerReady");
    });
}

export function askRefreshingBrowser() {
    if (!isBrowserRefreshEnabled()) return;

    getWebSocket().then((ws) => {
        ns_webSocket.sendMessage(ws, "askRefreshingBrowser");
    });
}

export function declareServerReady() {
    if (!isBrowserRefreshEnabled()) return;

    getWebSocket().then((ws) => {
        ns_webSocket.sendMessage(ws, "declareServerReady");
    });
}