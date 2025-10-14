# useUserInfos

✓ For server-side and browser-side.

This hook allows getting the Page object, which allows setting the page title and adding HTML headers.

**Usage sample**
```typescript jsx
import {usePage} from "jopi-rewrite/ui";
import React from "react";

export default function() {
    const myPage = usePage();
    myPage.setPageTitle("My page title");
    page.addToHeader("key-avoiding-double", <link key="1" href="my-custom-style.css" rel="stylesheet"/>);
    
    return <div>hello</div>
}
```