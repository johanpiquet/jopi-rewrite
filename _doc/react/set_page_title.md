# Modifier le titre de la page

Dans une page, le hook `usePageTitle` permet de modifier le titre de la page.

```typescript tsx
import {usePageTitle} from "jopi-rewrite/ui";  
import React from "react";  
  
export default function() {  
    usePageTitle("My page title");
	return <div>hello</div>
}
```