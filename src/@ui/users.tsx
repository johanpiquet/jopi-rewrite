import {isServerSide} from "./shared.ts";
import {decodeNavigatorCookie, useNavigateSafe, usePage} from "./otherHooks.tsx";
import React from "react";

export interface UiUserInfos {
    id: string;

    roles?: string[];
    email?: string;

    fullName?: string;
    nickName?: string;

    firstName?: string;
    lastName?: string;

    avatarUrl?: string;

    [key: string]: any;
}

export function useLogOutUser(): ()=>void {
    const page = usePage();

    return () => {
        page.logOutUser();
        page.onRequireRefresh();
    }
}

export function useUseStateRefresh() {
    const page = usePage();

    return () => {
        page.refreshUserInfos();
        page.onRequireRefresh();
    }
}

export function useUserHasRoles(roles: string[]): boolean {
    if (roles.length === 0) return true;

    let userInfos = useUserInfos();
    if (!userInfos) return false;

    let userRoles = userInfos.roles;
    if (!userRoles) return false;

    return !!roles.every(role => userRoles.includes(role));
}

export function useUserInfos(): UiUserInfos|undefined {
    const page = usePage();
    return page.getUserInfos();
}

export function RequireRoles({roles, ifRejected, children}: {
    roles: string[],
    ifRejected?: string,
    children: React.ReactNode
}) {
    const navigate = useNavigateSafe();
    const hasRoles = useUserHasRoles(roles);

    React.useEffect(() => {
        if (!hasRoles) {
            navigate(ifRejected || "/not-authorized");
        }
    }, [hasRoles, ifRejected, navigate]);

    if (hasRoles) {
        return children;
    }

    return null;
}

//region Tools

export function decodeJwtToken(jwtToken: string|undefined): UiUserInfos|undefined {
    if (!jwtToken) return undefined;

    const parts = jwtToken.split('.');
    if (parts.length !== 3) return undefined;

    const payload = parts[1];
    const decodedPayload = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decodedPayload) as UiUserInfos;
}

export function isUserInfoCookieUpdated(): boolean {
    const jwtToken = decodeNavigatorCookie("authorization");
    return jwtToken !== gAuthorizationCookiePreviousValue;
}

export function decodeUserInfosFromCookie(): UiUserInfos|undefined {
    if (isServerSide()) {
        return undefined;
    }

    let jwtToken = decodeNavigatorCookie("authorization");
    gAuthorizationCookiePreviousValue = jwtToken;

    return decodeJwtToken(jwtToken);
}

let gAuthorizationCookiePreviousValue = "";

//endregion