// noinspection JSUnusedGlobalSymbols
import React, { useEffect } from "react";
import { PageContext, PageController } from "./pageController.ts";
import { CssModule } from "./cssModules.tsx";
import * as jk_events from "jopi-toolkit/jk_events";
/**
 * Allow getting a reference to the PageController.
 * **USING IT MUST BE AVOIDED** since it's a technical item.
 * It's the reason of the underscore.
 */
export function _usePage() {
    var res = React.useContext(PageContext);
    // Not wrapped inside a PageContext?
    if (!res) {
        res = new PageController(true);
    }
    return res;
}
/**
 * Allows setting the page title.
 * @param title
 */
export function usePageTitle(title) {
    var page = React.useContext(PageContext);
    if (page)
        page.setPageTitle(title);
}
export function useCssModule(cssModule) {
    if (!cssModule)
        return;
    // Not a real CSS Module?
    var fileHash = cssModule.__FILE_HASH__;
    if (!fileHash)
        return;
    var ctx = _usePage();
    // Will allow knowing if the module is already inserted for this page.
    if (!ctx.data.jopiUseCssModule)
        ctx.data.jopiUseCssModule = {};
    // Not already added? Then add it.
    if (fileHash && !ctx.data.jopiUseCssModule[fileHash]) {
        ctx.data.jopiUseCssModule[fileHash] = true;
        // Will allow inlining the style inside the page.
        ctx.addToBodyBegin(fileHash, <CssModule key={fileHash} module={cssModule}/>);
    }
}
export function useServerRequest() {
    var page = _usePage();
    return page.getServerRequest();
}
/**
 * Allows listening to an event, and automatically
 * unregister when the component unmount.
 */
export function useEvent(evenName, listener) {
    useEffect(function () {
        if (evenName instanceof Array) {
            evenName.forEach(function (e) {
                jk_events.addListener(e, listener);
            });
            return function () {
                evenName.forEach(function (e) {
                    jk_events.removeListener(e, listener);
                });
            };
        }
        jk_events.addListener(evenName, listener);
        return function () { jk_events.removeListener(evenName, listener); };
    }, [evenName, listener]);
}
