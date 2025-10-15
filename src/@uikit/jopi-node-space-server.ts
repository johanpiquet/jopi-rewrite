import * as ns_event from "jopi-node-space/ns_events";
import type {WebSite, WebSiteImpl} from "jopi-rewrite";
import {UiKitModule} from "./uiKitCore.ts";
import {addGlobalUiInitFile} from "jopi-rewrite";
import * as ns_app from "jopi-node-space/ns_app";
import * as ns_fs from "jopi-node-space/ns_fs";

export function registerUiKit() {
    // We want to replace the creation of the object ModuleInitContext_UI
    // with our own implementation, which extend the core functionalities.
    //
    ns_event.addListener<WebSite>("jopi.webSite.created", (webSite) => {
        // @ts-ignore It doesn't correctly cast references.
        (webSite as WebSiteImpl).setUiInitInstancier(host => new UiKitModule(host));
    })

    addGlobalUiInitFile(ns_fs.join(ns_app.findPackageJsonDir(import.meta.dirname), "src", "@uikit", "initBrowser.ts"));
}