# Bind a page to a URL

To bind a React page to a URL in Jopi Rewrite:

1. Create a folder that matches the URL under a module's @routes directory.
2. Add a `page.tsx` (or `page.jsx`) file inside that folder.

Example:
- src/mod_app/@routes/admin/page.tsx → reachable at `/admin`

Behavior:
- The framework maps file paths to routes automatically.
- The `page.*` file should export a React component (server-rendered) and optionally export handlers (loaders) or metadata.

Notes:
- You can also create files handling POST requests using onPOST.ts (or similar naming used by the framework).
- Use special `.cond` files or config.ts to attach access controls or route-specific options.

## The "@routes" folder

Once created, your project looks like this:

```
|- node_modules/
|- package.json
|- tsconfig.json
|- src/
   |- mod_moduleA/
      |- @routes/        < The interesting part is here
   |- mod_moduleB/
      |- @routes/        < Each module can declare routes
```

Each module (here moduleA and moduleB) has an `@routes` folder whose contents are interpreted to determine which function corresponds to which URL. Each directory corresponds to a URL segment, while files named `page.tsx` define the content to display.

To clarify, here are some examples:
* The file `@routes/welcome/page.tsx` corresponds to the URL `http://mysite/welcome`.
* The file `@routes/products/listing/page.tsx` corresponds to the URL `http://mysite/product/listing`.
* The file `@routes/page.tsx` corresponds to the homepage `http://mysite/`.

## Example route

The following example defines a route and gives an overview of the files that can be present in the folder. Each item will be explained in detail afterwards.

```
|- @routes/product/listing
   |- page.tsx                   < Response to GET call
   |- onPOST.ts                  < Response to POST call
   |- onPUT.ts                   < Same for PUT/PATCH/OPTIONS/DELETE
   |- postNeedRole_Admin.cond    < Constraint on caller roles
   |- postNeedRole_Writer.cond   < Add a second constraint
   |- high.priority              < Set a priority
   |- config.ts                  < Allows other settings (like cache)
   |- cache.disable              < Disable the automatic cache
```

## The "page.tsx" file

Files named **page.tsx** allow the URL to respond with the content of a React page. The React content is transformed into HTML by the server and sent to the browser. Once the JavaScript is loaded, event handling becomes functional: the user can interact with the content.

Example `page.tsx` file:

```typescript tsx
import "./my-style.css";
import {usePageTitle} from "jopi-rewrite/ui";

export default function() {
	usePageTitle("My title");

    return <div onClick={()=>alert('click')}>
	    Click me!
	</div>
}
```

## The "onPOST.ts" file

The `onPOST.ts` (or onPOST.tsx) file defines the function that responds to a POST request on the URL.

Example `onPOST.ts` file:

```typescript tsx
import {JopiRequest, type LoginPassword} from "jopi-rewrite";

export default async function(req: JopiRequest) {
    const data = await req.getBodyData();
    const authResult = await req.tryAuthWithJWT(data as LoginPassword);

    if (!authResult.isOk) console.log("Auth failed");

    // Will automatically set a cookie.
    // That's why we don't cover the details here.
    return req.jsonResponse({isOk: authResult && authResult.isOk});
}
```

> You can do the same for other HTTP methods (PUT/PATCH/DELETE/...)

## The "config.ts" file

The `config.ts` file allows you to modify route configuration.

The three most useful items are:

* Middleware configuration.
* Cache configuration for pages.
* Role configuration.

```typescript
import {RouteConfig} from "jopi-rewrite";

export default function(ctx: RouteConfig) {
    // GET calls will require the user to have
	// the roles "admin" and "writer".
	ctx.onGET.addRequiredRole("admin", "writer");
}
```

## Condition files (.cond)

Files with the `.cond` extension allow defining role-related conditions. The filename contains information that is decoded according to the following naming convention: `whatNeedRole_roleName.cond`.

The following examples clarify:
* **postNeedRole_admin.cond**: means POST requests require the user to have the role "admin".
* **getNeedRole_writer.cond**: means GET requests require the user to have the role "writer".

If multiple constraints apply to the same method, they are cumulative. For example, if both **getNeedRole_writer.cond** and **getNeedRole_admin.cond** are present, the user must have both the writer and admin roles at the same time (not one or the other).

> Here the word `page` is an alias for `get`. So `pageNeedRole_writer` is equivalent to `getNeedRole_writer`.

## Priority files (.priority)

Each module can define routes and add new routes. It's also possible that a module replaces an existing route. When that happens, Jopi must know which module should take precedence: whose route will be used and whose will be ignored.

Priority files indicate which module has higher priority.

Priorities, from least to most priority, are: `verylow.priority`, `low.priority`, `default.priority`, `high.priority`, `veryhigh.priority`.

## The "cache.disable" file

By default React pages are cached. The `cache.disable` file disables this automatic cache.

You can also do this from the `config.ts` file and define cache rules there.
