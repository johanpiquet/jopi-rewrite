# useUserInfos and logOut

✓ For server-side and browser-side.

This hook allows getting information about the user connected.

> See the section about JWT authentification to see how to connect a user.

**Usage sample**
```typescript jsx
import {logOutUser, usePage} from "jopi-rewrite-ui";
import React from "react";

export default function() {
    usePage().setPageTitle("My page title");
    
    // logOutUser has not effect on server-side.
    // On browser side, it delete the authentification cookie.
    return <div onClick={() => logOutUser()}>Click to disconnect</div>
}
```