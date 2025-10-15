import * as ns_event from "jopi-node-space/ns_events";
import type {WebSite, WebSiteImpl} from "jopi-rewrite";
import {UiKitModule} from "../uiKitCore.ts";

export function registerUiKit() {
    // We want to replace the creation of the object  ModuleInitContext_UI
    // with our own implementation, which extend the core functionalities.
    //
    ns_event.addListener<WebSite>("jopi.webSite.created", (webSite) => {
        (webSite as WebSiteImpl).setUiInitInstancier((host) =>  {
            return new UiKitModule(host);
        });
    })
}

