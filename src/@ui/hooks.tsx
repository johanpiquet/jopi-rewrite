// noinspection JSUnusedGlobalSymbols

import React, {useEffect} from "react";
import {PageContext, PageController, PageController_ExposePrivate} from "./page.tsx";
import {CssModule, type UseCssModuleContextProps} from "./cssModules.tsx";
import * as jk_events from "jopi-toolkit/jk_events";

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

/**
 * Is a subset of JopiRequest, with only browser-side compatible items.
 */
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
                jk_events.addListener(e, listener);
            });

            return () => {
                evenName.forEach(e => {
                    jk_events.removeListener(e, listener);
                });
            }
        }

        jk_events.addListener(evenName, listener);
        return () => { jk_events.removeListener(evenName, listener) };
    }, [evenName, listener]);
}