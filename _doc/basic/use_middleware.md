# Use a middleware

Middlewares run before route handlers and can modify requests and responses.

Common uses:
- Authentication and authorization checks.
- Logging and request tracing.
- Body parsing and input normalization.

How to create:
1. Create a middleware file in a module or global folder.
2. Register the middleware in module configuration or global config.
3. Ensure middleware respects the framework's asynchronous flow and returns the next result.

Best practices:
- Keep middleware focused and composable.
- Avoid heavy computations inside middleware; delegate to handlers or background tasks.

# Middleware usage

## What is a middleware?

A middleware is a function called before a request is normally processed. For example, to filter the caller's IP and allow only certain IPs.

With Jopi, you have three ways to define a middleware:
* A middleware that applies to all URLs.
* A middleware that tests a regular expression to filter which URLs it applies to.
* A middleware associated with a specific route.

## What is a post-middleware?

A post-middleware runs after the request processing:
* Middleware: runs before normal request processing and can block the request.
* Post-middleware: runs after and can modify the response.

## Defining a global middleware

Global middlewares are defined in the module's `serverInit.ts` file. That file exports a function called just before the server starts. This is where you configure the server by adding features and modifying options.

```typescript
import {JopiEasyWebSite} from "jopi-rewrite";
import {JopiRequest} from "jopi-rewrite";

async function ipMiddleware(req: JopiRequest) {
    let ip = req.requestIP?.address;
    console.log("Caller IP is", ip);

    // null means it will continue to the next middleware.
    if (ip?.endsWith("127.0.0.1")) return null;

    // Returning a response stops the request processing.
    return req.returnError401_Unauthorized();
}

export default async function(webSite: JopiEasyWebSite) {
    webSite.configure_middlewares()
        .add_middleware(
            // Apply to GET call method only
            // You can also use "*" or undefined
            // if you want to apply to all methods.
            "GET",

            // Our function.
            ipMiddleware, {
                // Only urls starting with "/tests/".
                regExp: /^\/tests\//
            }
        );
}
```

## Defining a local middleware

Local middlewares are defined in a route's `config.ts` file.

```typescript
import {JopiRequest, RouteConfig} from "jopi-rewrite";

async function ipMiddleware(req: JopiRequest) {
    let ip = req.requestIP?.address;
    console.log("Caller IP is", ip);
    if (ip==="127.0.0.1") return null;
    return req.returnError401_Unauthorized();
}

export default function (config: RouteConfig) {
    config.onGET.add_middleware(ipMiddleware);
}
```
