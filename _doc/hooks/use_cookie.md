# useCookie / deleteCookie / setCookie

✓ useCookie is server-side and browser-side.
✓ setCookie and deleteCookie are browser only.

This hook allows getting a cookie.
* You can also use the function 'setCookie' to create or update a cookie.
* You can also use the function 'deleteCookie' to delete a cookie.

**Usage sample**
```typescript jsx
import {deleteCookie, setCookie, useCookie} from "jopi-rewrite-ui";
import React from "react";

export default function() {
    function doCreate() {
        setCookie("mycookie", "thevalue");
    }

    function doDelete() {
        deleteCookie("mycookie");
    }

    let mycookie = useCookie("mycookie");

    return <>
        <div>Value of mycookie: {mycookie}</div>
        <div onClick={doCreate}>Click me to create the cookie</div>
        <div onClick={doDelete}>Click me to delete the cookie</div>
    </>
}
```