import process from 'node:process';
import type {WebSite} from "../@core";
import * as jk_events from "jopi-toolkit/jk_events";

let gIsBrowserRefreshEnabled: boolean|undefined;

export function isBrowserRefreshEnabled(): boolean {
    if (gIsBrowserRefreshEnabled===undefined) {
        gIsBrowserRefreshEnabled = process.env.JOPIN_BROWSER_REFRESH_ENABLED === '1';
    }

    return gIsBrowserRefreshEnabled!;
}

export function getBrowserRefreshHtmlSnippet() {
    return `<script type="application/javascript">${getBrowserRefreshScript()}</script>`;
}

export function getBrowserRefreshScript() {
    return `new EventSource('/_jopirw_/bundler').addEventListener("change", () => window.location.reload());`;
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