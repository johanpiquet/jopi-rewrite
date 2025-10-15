// noinspection JSUnusedGlobalSymbols

import {useServerRequest} from "jopi-rewrite/ui";
import {getBundlerConfig} from "../../../@core/bundler/config.ts";
import {Link} from "react-router";
import React from "react";

//region Emulate ReactRouter api

type ParamKeyValuePair = [string, string];
type URLSearchParamsInit = string | ParamKeyValuePair[] | Record<string, string | string[]> | URLSearchParams;
type SetURLSearchParams = (nextInit?: URLSearchParamsInit | ((prev: URLSearchParams) => URLSearchParamsInit), navigateOpts?: NavigateOptions) => void;

interface NavigateOptions {
    replace?: boolean;
    state?: any;
    preventScrollReset?: boolean;
    relative?:  "route" | "path";
    flushSync?: boolean;
    viewTransition?: boolean;
}

interface Path {
    /**
     * A URL pathname, beginning with a /.
     */
    pathname: string;
    /**
     * A URL search string, beginning with a ?.
     */
    search: string;
    /**
     * A URL fragment identifier, beginning with a #.
     */
    hash: string;
}

export interface NavigateFunction {
    (to: string | Partial<Path>, options?: NavigateOptions): void | Promise<void>;
    (delta: number): void | Promise<void>;
}

//endregion

/**
 * Wrap the hook 'useNavigate' of ReactRouter
 * but make it server-side safe.
 */
export function useNavigateSafe(): NavigateFunction {
    return () => {};
}

/**
 * Wrap the hook 'useSearchParams' of ReactRouter
 * but make it server-side safe.
 */
export function useSearchParamsSafe(): [URLSearchParams, SetURLSearchParams] {
    return gFake_useSearchParams as [URLSearchParams, SetURLSearchParams];
}

/**
 * Listen routes changes.
 * It sends an 'app.router.locationUpdated' event with the React Router new location.
 */
export function useRouteChangeListener() {
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
    let req = useServerRequest();
    return req.urlParts;
}

const gFake_useSearchParams = [
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
];

export function RouterLink({to, onClick, children, ...p}: React.ComponentProps<"a"> & {
    to: string, onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void,
    children?: React.ReactNode
})
{
    if (getBundlerConfig().reactRouter.disable) {
        return <a href={to} onClick={onClick} {...p}>{children}</a>;
    } else {
        return <Link to={to} onClick={onClick} {...p}>{children}</Link>;
    }
}