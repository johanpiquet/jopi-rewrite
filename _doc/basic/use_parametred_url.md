# Use parameterized URLs

Jopi supports parameterized routes using bracket syntax similar to modern frameworks.

Examples:
- src/.../@routes/product/[id]/page.tsx → matches `/product/123`
- src/.../@routes/user/[username]/page.tsx → matches `/user/jdoe`

How to use parameters:
- In server-rendered pages, the framework provides the parameter values through the request context or page props.
- In client-side code, parameters can be read via the routing utilities or props passed during hydration.

Guidelines:
- Use descriptive parameter names.
- Validate and sanitize parameters before using them in lookups.

## Defining a parameterized URL

Suppose you have the following URLs:

* http://mysite/product/productAA
* http://mysite/product/productAB
* ...
* http://mysite/product/productZZ

Here the URL indicates the product identifier we want to display. However, we would like to use the same code to handle all these products.

This is where parameterized URLs are essential.

At the router files level, using brackets defines a URL parameter. What is inside the brackets is the parameter name.

**Example of defining the parameter productId**
```
@routes/
|- product/                < mapped to url http://mysite/product
   |-[productId]/          < url of type http://mysite/product/productAA
     |- page.tsx           < define the visual
```

## Retrieving the information

### Using a React hook

The following example shows how to use a hook to retrieve URL parameters from React.js.

```typescript
import {usePageParams} from "jopi-rewrite/uikit";

export default function Product() {
    const pageParams = usePageParams();
    return <div>Product is {pageParams.productId}</div>;
}
```

### From a listener such as onPOST.ts

The following example shows how to retrieve URL parameters from a JopiRequest object, as provided in files like `onPOST.ts`, `onPUT.ts`, ...

```typescript
import {JopiRequest} from "jopi-rewrite";

export default async function(req: JopiRequest) {
    console.log("ProductId: ", req.urlParts.productId);
    return req.htmlResponse("");
}
```
