import process from 'node:process';
import type {WebSite} from "../@core";
import * as ns_events from "jopi-node-space/ns_events";

let gIsBrowserRefreshEnabled: boolean|undefined;

export function isBrowserRefreshEnabled(): boolean {
    if (gIsBrowserRefreshEnabled===undefined) {
        gIsBrowserRefreshEnabled = process.env.JOPIN_BROWSER_REFRESH_ENABLED === '1';
    }

    return gIsBrowserRefreshEnabled!;
}

export function getBrowserRefreshHtmlSnippet() {
    return `<script type="application/javascript">
        new EventSource('/_jopirw_/bundler').addEventListener("change", () => window.location.reload());
    </script>`;
}

export function installBrowserRefreshSseEvent(webSite: WebSite) {
    webSite.addSseEVent("/_jopirw_/bundler", {
        getWelcomeMessage() {
            return "Jopi Rewrite - Browser refresh";
        },

        handler(controller) {
            ns_events.addListener("jopi.bundler.watch.afterRebuild", () => {
                console.log("🔥 JopiN - UI change detected: refreshing browser");
                controller.send("change", "updated");
            });
        }
    });
}