import * as ns_event from "jopi-toolkit/jk_events";
import type {WebSite, WebSiteImpl} from "jopi-rewrite";
import {addLoaderScriptPlugin} from "jopi-rewrite";
import {UiKitModule} from "./UiKitModule.ts";

export function registerUiKit() {
    // We want to replace the creation of the object ModuleInitContext_UI
    // with our own implementation, which extend the core functionalities.
    //
    ns_event.addListener<WebSite>("jopi.webSite.created", (webSite) => {
        // @ts-ignore It doesn't correctly cast references.
        (webSite as WebSiteImpl).setUiInitInstancier(host => new UiKitModule(host));
    });

    addLoaderScriptPlugin(async (params) => {
        params.tplDeclarations += `

// Allow providing an instance of UiKitModule in place of ModuleInitContext_UI.
window["_JOPI_CREATE_MODULE_INIT_CONTEXT_"] = function() { return new UiKitModule() };`;

        params.tplImport += `
import {UiKitModule} from "jopi-rewrite/uikit";
        `
    })
}