// noinspection JSUnusedGlobalSymbols

import React from "react";

export type NavigateFunction = (to: string) => void;

export function useRouterNavigate(): NavigateFunction {
    return (to: string) => {
        window.location.href = to;
    };
}

export function useSendRouterLocationUpdateEvent(_eventName?: string) {
    // Nothing to do if no router enaled.
}

export function useRouterSearchParams(): URLSearchParams {
    return new URL(window.location.href).searchParams;
}

interface Path {
    pathname: string;
    search: string;
    hash: string;
}

export function useRouterLocation(): Path {
    const [location] = React.useState<Path>(new URL(window.location.href));
    return location;
}

export function usePageParams(): any {
    // Page params is specific to router (server and browser-side).
    // Here router is disabled, so we have nothing to return.
    // TODO: the server can set route info on the <Page/> values.
    //
    return {};
}

export function RouterLink({to, onClick, children, ...p}: React.ComponentProps<"a"> & {
    to: string, onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void,
    children?: React.ReactNode
})
{
    return <a href={to} onClick={onClick} {...p}>{children}</a>;
}