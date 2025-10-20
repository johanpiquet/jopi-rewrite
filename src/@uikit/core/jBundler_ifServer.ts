import * as ns_event from "jopi-toolkit/jk_events";
import type {WebSite, WebSiteImpl} from "jopi-rewrite";
import {UiKitModule} from "./UiKitModule.ts";
import {addGlobalUiInitFile} from "jopi-rewrite";
import * as jk_app from "jopi-toolkit/jk_app";
import * as jk_fs from "jopi-toolkit/jk_fs";

export function registerUiKit() {
    // We want to replace the creation of the object ModuleInitContext_UI
    // with our own implementation, which extend the core functionalities.
    //
    ns_event.addListener<WebSite>("jopi.webSite.created", (webSite) => {
        // @ts-ignore It doesn't correctly cast references.
        (webSite as WebSiteImpl).setUiInitInstancier(host => new UiKitModule(host));
    })

    addGlobalUiInitFile(jk_fs.join(jk_app.findPackageJsonDir(import.meta.dirname), "src", "@uikit", "core", "initBrowser.ts"));
}