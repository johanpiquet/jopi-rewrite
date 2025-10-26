import * as ns_event from "jopi-toolkit/jk_events";
import type {WebSite, WebSiteImpl} from "jopi-rewrite";
import {UiKitModule} from "./UiKitModule.ts";

/**
 * Must be called manually from the server-side init to enable UiKit.
 * This will allow replacing the instance of ModuleInitContext
 * by an instance of UiKitModule.
 */
export function registerUiKit() {
    // We want to replace the creation of the object ModuleInitContext
    // with our own implementation, which extend the core functionalities.
    //
    ns_event.addListener<WebSite>("jopi.webSite.created", (webSite) => {
        // @ts-ignore It doesn't correctly cast references.
        (webSite as WebSiteImpl).setModuleInitClassInstancier(host => new UiKitModule(host));
    });
}