import {ComponentAlias} from "jopi-rewrite/ui";
import React from "react";

/**
 * It's a common alias for the admin layout.
 */
export function AdminPageLayout({children}: {children?: React.ReactNode}) {
    return <ComponentAlias name="page.layout.admin">{children}</ComponentAlias>
}