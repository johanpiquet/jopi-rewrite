# useExecuteOnce

✓ For server-side and browser-side.

This hook allows executing a function the first time the component is mounted is the component hierarchy.

**Usage sample**
```typescript
import {useExecuteOnce} from "jopi-rewrite-ui";
import React from "react";

let counter = 0;

export default function() {
    useExecuteOnce(() => {
        console.log("Executing useExecuteOnce");
        counter++;
    }, import.meta.filename);

    return <div>Counter {counter}</div>
}
```