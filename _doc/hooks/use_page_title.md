# useUserInfos

✓ For server-side and browser-side.

This hook makes it easy to set the page title.

**Usage sample**
```typescript jsx
import {usePageTitle} from "jopi-rewrite-ui";
import React from "react";

export default function() {
    usePageTitle("My page title");
    return <div>hello</div>
}
```