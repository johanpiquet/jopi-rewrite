// noinspection JSUnusedGlobalSymbols

import React, {useEffect, useState} from "react";
import {type SetURLSearchParams, useLocation, useNavigate, useParams as rrUserParams, useSearchParams} from "react-router";
import {PageContext, PageController, PageController_ExposePrivate} from "./page.tsx";
import {CssModule, type UseCssModuleContextProps} from "./cssModules.tsx";

import * as ns_events from "jopi-node-space/ns_events";
import {isBrowser, isServerSide} from "jopi-node-space/ns_what";
import * as n_what from "jopi-node-space/ns_what";

//region React Router

/**
 * Wrap the hook 'useNavigate' of ReactRouter
 * but make it server-side safe.
 */
export function useNavigateSafe() {
    if (isServerSide) return () => {};
    return useNavigate();
}

/**
 * Wrap the hook 'useSearchParams' of ReactRouter
 * but make it server-side safe.
 */
export function useSearchParamsSafe(): [URLSearchParams, SetURLSearchParams] {
    if (isServerSide) return gServerSideFake_useSearchParams as [URLSearchParams, SetURLSearchParams];
    return useSearchParams();
}

/**
 * Listen routes changes.
 * It sends an 'app.router.locationUpdated' event with the React Router new location.
 */
export function useRouteChangeListener() {
    if (isBrowser) {
        const location = useLocation();

        useEffect(() => {
            ns_events.sendEvent("app.router.locationUpdated", location);
        }, [location]);
    }
}

const gServerSideFake_useSearchParams = [
    {
        size: 0,
        get() { return null },
        has() { return false },
        forEach() { },
        append() {},
        delete() {},
        set() {},
        keys() { return [] },
        values() { return [] },
        entries() { return [] },
        toString() { return "" },
    },

    function() {}
]

//endregion

/**
 * Allows getting the page object and alter it.
 */
export function useOnPageRendering<T = any>(f: (page: PageController<T>) => void) {
    const page = React.useContext(PageContext) as PageController<T>;
    if (page) f(page);
}

/**
 * Allows setting the page title.
 * @param title
 */
export function usePageTitle(title: string) {
    const page = React.useContext(PageContext) as PageController;
    if (page) page.setPageTitle(title);
}

export function usePage<T = any>(): PageController<T> {
    let res = React.useContext(PageContext) as PageController<T>;

    // Not wrapped inside a PageContext?
    if (!res) {
        res = new PageController<T>(true);
    }

    return res;
}

/**
 * Returns parameters for the page.
 * This is the part of the url.
 *
 * This function works server side and browser side.
 *
 * If the url is https://mywebsite/product-name/list
 * and the route is http://mywebsite/$product/list
 * then urlParts contains {product: "product-name"}
 */
export function usePageParams(): any {
    if (n_what.isServerSide) {
        let req = useServerRequest();
        return req.urlParts;
    } else {
        return rrUserParams();
    }
}

export function useCssModule(cssModule: undefined | Record<string, string>) {
    if (!cssModule) return;

    const fileHash = cssModule.__FILE_HASH__;
    if (!cssModule.__FILE_HASH__) return;

    const ctx = usePage<UseCssModuleContextProps>();

    if (!ctx.data.jopiUseCssModule) ctx.data.jopiUseCssModule = {};

    if (fileHash && !ctx.data.jopiUseCssModule[fileHash]) {
        ctx.data.jopiUseCssModule![fileHash] = true;

        // Will allow inlining the style inside the page.
        ctx.addToBodyBegin(fileHash, <CssModule key={fileHash} module={cssModule}/>);
    }
}

export interface ServerRequestInstance {
    urlParts?: Record<string, any>;
    urlInfos: URL;
    customData: any;

    getJwtToken(): string | undefined;

    headers: Headers;
    hasCookie(name: string, value?: string): boolean;
    getCookie(name: string): string | undefined;
}

export function useServerRequest(): ServerRequestInstance {
    let page = usePage();
    return (page as PageController_ExposePrivate).getServerRequest();
}

/**
 * Allows listening to an event, and automatically
 * unregister when the component unmount.
 */
export function useEvent(evenName: string|string[], listener: (data: any) => void) {
    useEffect(() => {
        if (evenName instanceof Array) {
            evenName.forEach(e => {
                ns_events.addListener(e, listener);
            });

            return () => {
                evenName.forEach(e => {
                    ns_events.removeListener(e, listener);
                });
            }
        }

        ns_events.addListener(evenName, listener);
        return () => { ns_events.removeListener(evenName, listener) };
    }, [evenName, listener]);
}