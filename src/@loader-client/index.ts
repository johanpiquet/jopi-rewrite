import process from 'node:process';
import type {WebSite} from "../@core";
import * as jk_events from "jopi-toolkit/jk_events";
import {isBunJS} from "jopi-toolkit/jk_what";

let gIsBrowserRefreshEnabled: boolean|undefined;

export function isBrowserRefreshEnabled(): boolean {
    if (gIsBrowserRefreshEnabled===undefined) {
        gIsBrowserRefreshEnabled = process.env.JOPIN_BROWSER_REFRESH_ENABLED === '1';
    }

    return gIsBrowserRefreshEnabled!;
}

export function isDevUiEnabled() {
    return process.env.JOPI_DEV_UI === "1";
}

export function isReactHMR() {
    return isDevUiEnabled() && isBunJS;
}

export function getBrowserRefreshHtmlSnippet() {
    return `<script type="application/javascript">${getBrowserRefreshScript()}</script>`;
}

function sse_onChange() {
    const event = new EventSource('/_jopirw_/bundler');
    let isFirstConnection = true;

    // This allows refreshing the browser when
    // the connection is lost, and the browser connect again.
    //
    event.addEventListener('open', () => {
        if (isFirstConnection) isFirstConnection = false;
        else window.location.reload();
    });

    // This allows refreshing the browser when
    // the server send a signal to the browser.
    //
    event.addEventListener("change", () => window.location.reload());
}

let g_sse_onChange: string|undefined;

export function getBrowserRefreshScript() {
    if (!g_sse_onChange) {
        g_sse_onChange = sse_onChange.toString();
    }

    return `(${g_sse_onChange})()`;
}

export function installBrowserRefreshSseEvent(webSite: WebSite) {
    webSite.addSseEVent("/_jopirw_/bundler", {
        getWelcomeMessage() {
            return "Jopi Rewrite - Browser refresh";
        },

        handler(controller) {
            jk_events.addListener("jopi.bundler.watch.afterRebuild", () => {
                console.log("🔥 JopiN - UI change detected: refreshing browser");
                controller.send("change", "updated");
            });
        }
    });
}
