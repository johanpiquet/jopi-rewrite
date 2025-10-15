// noinspection JSUnusedGlobalSymbols

import React, {useEffect, useState} from "react";
import {type SetURLSearchParams, useLocation, useNavigate, useParams as rrUserParams, useSearchParams} from "react-router";
import {PageContext, PageController, PageController_ExposePrivate} from "./page.tsx";
import {CssModule, type UseCssModuleContextProps} from "./cssModules.tsx";

import * as ns_events from "jopi-node-space/ns_events";
import {isBrowserSide, isServerSide} from "./shared.ts";
import {type MenuItem} from "./menuManager.ts";
import * as n_what from "jopi-node-space/ns_what";

//region React Router adapters

/**
 * Wrap the hook 'useNavigate' of ReactRouter
 * but make it server-side safe.
 */
export function useNavigateSafe() {
    if (isServerSide()) return () => {};
    return useNavigate();
}

/**
 * Wrap the hook 'useSearchParams' of ReactRouter
 * but make it server-side safe.
 */
export function useSearchParamsSafe(): [URLSearchParams, SetURLSearchParams] {
    if (isServerSide()) return gServerSideFake_useSearchParams as [URLSearchParams, SetURLSearchParams];
    return useSearchParams();
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

//region Cookies

export function setCookie(name: string, value: string, maxAge?: number) {
    if (isServerSide()) return;

    let cookieStr = `${name}=${value}; path=/`;

    if (maxAge !== undefined) {
        cookieStr += `; max-age=${maxAge}`;
    }

    document.cookie = cookieStr;
}

export function deleteCookie(name: string) {
    if (isServerSide()) return;

    let current = decodeNavigatorCookie(name);
    if (current === undefined) return;

    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;

    // Allow to be ok until document.cookie is refreshed.
    delete gCookies![name];
}

/**
 * Returns the value of the cookie.
 * Works browser side and server side.
 *
 * @param name
 *      The name of the cookie we want.
 */
export function decodeNavigatorCookie(name: string) {
    if (isServerSide()) {
        return "";
    }

    let currentCookies = document.cookie;

    if (gCookies) {
        if (gCookieString !== currentCookies) {
            gCookieString = currentCookies;
            gCookies = undefined;
        }
    }

    if (!gCookies) {
        gCookies = {};

        currentCookies.split(';').forEach(c => {
            c = c.trim();
            let idx = c.indexOf("=");
            gCookies![c.substring(0, idx)] = c.substring(idx + 1);
        });
    }

    return gCookies![name];
}
//
let gCookies: undefined|Record<string, string>;
let gCookieString = "";

//endregion

//region Page

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

/**
 * Listen routes changes.
 * It sends an 'app.router.locationUpdated' event with the React Router new location.
 */
export function useRouteChangeListener() {
    if (isBrowserSide()) {
        const location = useLocation();

        useEffect(() => {
            ns_events.sendEvent("app.router.locationUpdated", location);
        }, [location]);
    }
}

//endregion

//region Menus

export function useMenu(name: string): MenuItem[] {
    const page = usePage();

    if (isServerSide()) {
        return page.getMenuManager().getMenuItems(name);
    }

    const [count, setCount] = useState(0);

    useEvent(["app.menu.invalided", "app.menu.activeItemChanged"], () => {
        setCount(count + 1);
    });

    return page.getMenuManager().getMenuItems(name);
}

//endregion

/**
 * Allow refreshing the React component.
 */
export function useRefresh() {
    const [count, setCount] = useState(0);
    return () => setCount(count + 1);
}

export function useSendJsonData<T = any>(onFormReturns?: (data: T) => void, url?: string): UseSendPostDataResponse<T> {
    if (isServerSide()) {
        return [() => {}, undefined, false]
    }

    const [state, setState] = useState<T|undefined>(undefined);
    const [isSending, setIsSending] = useState(false);

    async function f(data: T) {
        url = url || window.location.href;

        try {
            setIsSending(true);

            const response = await fetch(url!, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(data),
                credentials: 'include'
            });

            if (response.ok) {
                let v = await response.json() as T;
                setState(v);
                if (onFormReturns) onFormReturns(v);
            } else {
                console.error("useSendPostData - Not 200 response", response);
            }
        } catch (e) {
            console.error("useSendPostData - Network error", e);
        }
        finally {
            setIsSending(false);
        }
    }

    return [f, state, isSending];
}
//
type UseSendPostDataResponse<T> = [
    (data: T) => void
    , T | undefined,
    boolean
];

/**
 * Allow submitting a form.
 *
 * @param onFormReturns
 *      A function which is called when the form call returns positively.
 * @param url
 *      An optional url to url.
 * @returns
 *      Return an array of two elements:
 *          - Set function allowing to submit the form.
 *            It takes in arg the event sent by Form.onSubmit
 *          - Set value of the form, or undefined if not submit.
 */
export function useFormSubmit<T = any>(onFormReturns?: (data: T) => void, url?: string): UseFormSubmitResponse<T> {
    if (isServerSide()) {
        return [() => {}, undefined, false]
    }

    const [state, setState] = useState<T|undefined>(undefined);
    const [isSending, setIsSending] = useState(false);

    async function f(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        url = url || window.location.href;

        const formData = new FormData(e.currentTarget);
        setIsSending(true);

        try {
            const response = await fetch(url!, {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });

            if (response.ok) {
                let v = await response.json() as T;
                setState(v);
                if (onFormReturns) onFormReturns(v);
            } else {
                console.error("useFormSubmit - Not 200 response", response);
            }
        } catch (e) {
            console.error("useFormSubmit - Network error", e);
        }
        finally {
            setIsSending(false);
        }
    }

    return [f, state, isSending];
}
//
type UseFormSubmitResponse<T> = [
    (e: React.FormEvent<HTMLFormElement>) => void,
    T | undefined,
    boolean
];

/**
 * Execute the function only one time per React component.
 * Which means that if this function is called elsewhere with useExecuteOnce
 * then it will be executed again.
 *
 * @param f
 *      The function to call.
 *
 * @param key
 *      A key which is used server side in order to make the call unique.
 *      If undefined, then a key is calculated. Providing our own key
 *      allow making things a little faster, since calculating an uniq
 *      key require parsing a call-stack.
 */
export function useExecuteOnce(f: () => void, key?: string) {
    function calcCallerKey(): string {
        if (key) return key;
        const stack = new Error().stack;

        // Will return the name of the file and his position in the file.
        // This will act as a uniq key.
        //
        return stack?.split('\n')[3]?.trim() || Math.random().toString();
    }

    if (isServerSide()) {
        let serverRequest = useServerRequest();

        // A key identifying the caller.
        let key = calcCallerKey();

        // Will allows to store keys already processed.
        let asSet = serverRequest.customData.jopiUseExecuteOnce as Set<string>;

        if (!asSet) {
            serverRequest.customData.jopiUseExecuteOnce = asSet = new Set<string>();
            asSet.add(key);
            f();
        } else {
            if (!asSet.has(key)) {
                asSet.add(key);
                f();
            }
        }
    } else {
        const executedRef = React.useRef(false);

        useEffect(() => {
            if (!executedRef.current) {
                executedRef.current = true;
                f();
            }
        }, []);
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

export function useRefreshOnEvent(evenName: string|string[]) {
    const [_, setCounter] = useState(0);
    useEvent(evenName, () => { setCounter(prev => prev + 1) });
}

export function useEventValue<T = any>(evenName: string|string[]): T|undefined {
    const [value, setValue] = useState<T|undefined>(undefined);
    useEvent(evenName, (data) => { setValue(data) });
    return value;
}