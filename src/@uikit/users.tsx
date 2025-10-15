import {isServerSide} from "jopi-node-space/ns_what";
import {decodeNavigatorCookie, useNavigateSafe, usePage, type UiUserInfos} from "jopi-rewrite/ui";
import {useEffect} from "react";

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

    useEffect(() => {
        if (!hasRoles) {
            navigate(ifRejected || "/not-authorized");
        }
    }, [hasRoles, ifRejected, navigate]);

    if (hasRoles) {
        return children;
    }

    return null;
}