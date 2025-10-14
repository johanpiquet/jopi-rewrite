# Use page router

The file router is a mechanism allowing simplifying many things by replacing API call by automatic behaviors based on code convention.
Using it saves a lot of time!

It allows using a file-based convention to:
* Automatically declare server routes.
* Bind a React.js component to these routes to server pages.
* Configure React Router for the browser side [see](https://reactrouter.com/).
* Bind POST/PUT/ ... listener to these routes.  

## How to use it?

To enable router, you need to enable this feature and create the files inside the `src/routes` directory.

### Enabling the router

Here is a sample that enables the router. It's basic, since all the required things are automatic once the router enabled.

**Enabling the page router**
```typescript jsx
import {jopiApp} from "jopi-rewrite";

jopiApp.startApp(import.meta, jopiEasy => {
    jopiEasy.new_webSite("http://127.0.0.1")
        // This enable the router.
        .enable_automaticRoutes();
});
```

### Adding a route

Here we will add an HTML page for the url `http:/127.0.0.1/products/listing`.
To do it, we only need to create a file named `index.page.tsx` in the directory `src/routes/products/listing`.

> You can also replace it by `src/routes/product/listing.page.tsx` to shorten things.

**File `src/products/listing/index.page.tsx`**

```typescript jsx
import {usePage} from "jopi-rewrite/ui";
import React from "react";

export default function() {
    const page = usePage();
    page.setPageTitle("My page title");

    return <div>My home page</div>;
}
```

### A route with url parameters

Here we want to handle urls of type `http://127.0.0.1/products/my-product-name` by using the same React
component for all our products (and this without a file per product!).

To do it, with use a thing called `url parameter`. Enabling it is simple and only needs a special convention in the directory name.

Instead of creating a file `src/routes/products/my-product-name/index.page.tsx` here you
will create a file `src/routes/products/$productName/index.page.tsx` with this content.

This same file will allow to response to all url this type:
* http://127.0.0.1/products/computer
* http://127.0.0.1/products/ssd
* http://127.0.0.1/products/tuto

**Sample page with a parametrized url**
```typescript jsx
import {usePageParams} from "jopi-rewrite/ui";

export default function() {
    let params = usePageParams();
    
    return <div>
        Details page for product {params.productName}
    </div>;
}
```

Here the value of 'params.productName' will be replaced by computer / ssd / tuto / ...

## React Router

React Router is a React framework allowing using JavaScript inside the browser to bind the url to React components
and emulate page changes. You seem to navigate in a real website, with pages returned by the server, but in fact
this page is created by something like an internal server inside the browser.

Jopi Rewrite **automatically enables and configures React Router** when you enable the page router functionality.

It allows a website acting as an application, where internal state isn't lost between page changes.

❌ Without React Router, any click on a link will load a new page, and reset the current state.
✅ With React Router, you keep things in memory, until you manually refresh the page by clicking on the refresh button of the browser.

> Here React Router is also configured on server side, doing that you can use the `Link` feature.  
> See: [React Router Link](https://api.reactrouter.com/v7/functions/react_router.Link.html)
>
### Reacting to a POST call

## What is it?

As you can use a file to bind a page to an url, you can also use a file to catch POST calls (and also POST/DELETE/...).

You can also use it to manually pre/post process GET call, for example, to enable a page cache.

## How to use it?

Here we use the same path logic, but instead of a file named `index.page.tsx` you will create a file named `index.server.tsx`.

In this file, you will use an object of type `RouteServerContext` to bind listener to the server calls 
(GET/POST/...). 

**Sample index.server.tsx file**
```typescript
import {RouteServerContext} from "jopi-rewrite";


export default function(ctx: RouteServerContext) {
    // Process POST call to the url corresponding the page route. 
    ctx.onPOST(async req => {
        // Get the data send to the server.
        const data = await req.getReqData();
        // Return it as-is, in json format.
        return req.jsonResponse(data);
    });

    // Here we will enable a cache for our React page.
    ctx.onGET(async (req, next) => {
        import {getRouteServerContext} from "jopi-rewrite";

        let ctx = getRouteServerContext();

        ctx.onGET(async (req, next) => {
            let res = await req.getFromCache();

            if (!res) {
                // Here 'next' allows rendering the content of index.page.tsx.
                res = await next(req);
                await req.addToCache(res);
            }

            return res;
        });
        // Here next allows to render the content of index.page.tsx.
        const res = next(req);
        return res;
    });
}
```