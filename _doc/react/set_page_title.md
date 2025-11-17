# Change the page title

In a page, the `usePageTitle` hook allows you to change the page title.

```typescript tsx
import {usePageTitle} from "jopi-rewrite/ui";  
import React from "react";  
  
export default function() {  
    usePageTitle("My page title");
	return <div>hello</div>
}
```