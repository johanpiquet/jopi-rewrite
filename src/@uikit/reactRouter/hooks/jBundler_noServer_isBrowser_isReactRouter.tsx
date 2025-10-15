// noinspection JSUnusedGlobalSymbols

import React, {useEffect} from "react";
import {Link, useLocation, useNavigate, useSearchParams} from "react-router";
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

export function RouterLink({to, onClick, children, ...p}: React.ComponentProps<"a"> & {
    to: string, onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void,
    children?: React.ReactNode
})
{
    return <Link to={to} onClick={onClick} {...p}>{children}</Link>;
}