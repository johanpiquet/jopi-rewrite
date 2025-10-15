import {useEffect} from "react";
import {type SetURLSearchParams, useLocation, useNavigate, useSearchParams} from "react-router";
import {useParams as rrUserParams} from "react-router";
import * as ns_events from "jopi-node-space/ns_events";
import {isBrowser, isServerSide} from "jopi-node-space/ns_what";
import {useServerRequest} from "jopi-rewrite/ui";

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
    if (isServerSide) {
        let req = useServerRequest();
        return req.urlParts;
    } else {
        return rrUserParams();
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
];