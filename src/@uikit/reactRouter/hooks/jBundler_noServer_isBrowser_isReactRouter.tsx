// noinspection JSUnusedGlobalSymbols

import React, {useEffect} from "react";
import {Link, useLocation, useNavigate, useParams as rrUserParams, useSearchParams} from "react-router";
import * as ns_events from "jopi-node-space/ns_events";

export function useRouterNavigate() {
    let f = useNavigate();
    return (to: string) => { f(to); }
}

export function useRouterSearchParams(): URLSearchParams {
    let r = useSearchParams();
    return r[0];
}

export const useRouterPageParams = rrUserParams;

interface Path {
    pathname: string;
    search: string;
    hash: string;
}

export function useRouterLocation(): Path {
    return useLocation();
}

export function useSendRouterLocationUpdateEvent(eventName: string = "app.router.locationUpdated") {
    let newLocation = useLocation();
    ns_events.sendEvent(eventName, newLocation);
}

export function RouterLink({to, onClick, children, ...p}: React.ComponentProps<"a"> & {
    to: string, onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void,
    children?: React.ReactNode
})
{
    return <Link to={to} onClick={onClick} {...p}>{children}</Link>;
}