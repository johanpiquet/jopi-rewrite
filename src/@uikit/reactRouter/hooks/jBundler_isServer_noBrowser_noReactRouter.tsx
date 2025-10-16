// noinspection JSUnusedGlobalSymbols

import {useServerRequest} from "jopi-rewrite/ui";
import {getBundlerConfig} from "jopi-rewrite";
import {Link} from "react-router";
import React from "react";

export type NavigateFunction = (to: string) => void;

export function useRouterNavigate(): NavigateFunction {
    // Server-side can't change the page.
    return () => {};
}

export function useRouterSearchParams(): URLSearchParams {
    let req = useServerRequest();
    return req.urlParts!.searchParams;
}

interface Path {
    pathname: string;
    search: string;
    hash: string;
}

export function useRouterLocation(): Path {
    let req = useServerRequest();
    return req.urlInfos;
}

export function useSendRouterLocationUpdateEvent(_eventName?: string) {
    // Nothing to do on the server-side.
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

export function RouterLink({to, onClick, children, ...p}: React.ComponentProps<"a"> & {
    to: string, onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void,
    children?: React.ReactNode
})
{
    if (gIsReactRouterEnabled===undefined) {
        gIsReactRouterEnabled = getBundlerConfig().reactRouter.disable!==true;
    }

    if (gIsReactRouterEnabled) {
        return <Link to={to} onClick={onClick} {...p}>{children}</Link>;
    } else {
        return <a href={to} onClick={onClick} {...p}>{children}</a>;
    }
}

let gIsReactRouterEnabled: boolean|undefined;