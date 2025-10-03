# useUserInfos and useLogOutUser

✓ For server-side and browser-side.

This hook allows getting information about the user connected.

> See the section about JWT authentification to see how to connect a user.

**Usage sample**
```typescript jsx
import {useLogOutUser, usePage} from "jopi-rewrite-ui";
import React from "react";

export default function() {
    usePage().setPageTitle("My page title");
    const logOutUser = useLogOutUser();
    
    // logOutUser has not effect on server-side.
    // On browser side, it delete the authentification cookie.
    return <div onClick={() => logOutUser()}>Click to disconnect</div>
}
```