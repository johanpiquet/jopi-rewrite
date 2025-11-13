# Change the page title

Set the page title for SEO and usability.

Server-side:
- Render the <title> tag as part of the server-generated HTML head.

Client-side:
- Use document.title or a library (e.g., React Helmet) inside an effect to update the title after hydration.

Recommendation:
- Keep titles descriptive and unique per page for better search engine indexing.

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
