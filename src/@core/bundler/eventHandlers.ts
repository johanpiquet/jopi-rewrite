import * as ns_events from "jopi-node-space/ns_events";
import {askRefreshingBrowser} from "jopi-rewrite/loader-client";

ns_events.addListener("jopi.bundler.watch.afterRebuild", () => {
    console.log("🔥 JopiN - UI change detected: refreshing browser");
    askRefreshingBrowser();
});