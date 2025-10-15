import {useEffect} from "react";
import {useLocation, useNavigate, useSearchParams} from "react-router";
import {useParams} from "react-router";
import * as ns_events from "jopi-node-space/ns_events";

/**
 * Is called from the generated file 'loader.jsx'
 * to enable ReactRouter version of some React hooks.
 */
export function enableReactRouter() {
    ns_events.sendEvent("jopi.reactRouter.enabled", {
        useNavigateSafe: useNavigate,
        useSearchParamsSafe: useSearchParams,
        usePageParams: useParams,
        useRouteChangeListener: useRouteChangeListener
    });
}

function useRouteChangeListener() {
    const location = useLocation();

    useEffect(() => {
        ns_events.sendEvent("app.router.locationUpdated", location);
    }, [location]);
}
