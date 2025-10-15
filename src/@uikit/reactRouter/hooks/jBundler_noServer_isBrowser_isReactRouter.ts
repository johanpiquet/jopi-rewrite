import {useEffect} from "react";
import {useLocation, useNavigate, useSearchParams} from "react-router";
import {useParams as rrUserParams} from "react-router";
import * as ns_events from "jopi-node-space/ns_events";

export const useNavigateSafe = useNavigate;
export const useSearchParamsSafe = useSearchParams;
export const usePageParams = rrUserParams;

export function useRouteChangeListener() {
    const location = useLocation();

    useEffect(() => {
        ns_events.sendEvent("app.router.locationUpdated", location);
    }, [location]);
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

alert("reactRouter - jBundler_noServer_isBrowser_isReactRouter");