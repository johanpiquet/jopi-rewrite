# useRefresh

✓ For browser-side.

This hook allows forcing refreshing the current component and redraw it. 

**Usage sample**

```typescript jsx
import React from "react";
import {useLogOutUser, useRefresh, useUserInfos} from "jopi-rewrite/ui";

export default function () {
    const doLogOut = () => {
        // Remove the cookie.
        logOutUser();
        
        // Force refresh.
        refresh();
    };
    
    const logOutUser = useLogOutUser();
    const refresh = useRefresh();
    const infos = useUserInfos();
    
    if (infos) return <div onClick={logOut}>Click to logout</div>;
    return <div>Is not connected</div>
}
```