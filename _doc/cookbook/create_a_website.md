# Create a website

### More than one WebSite
Jopi Rewrite allows you to create servers exposing multiple websites, which is useful when used as a cache or as a proxy.

For this reason, the creation of the server and the creation of the *WebSite* are done in two steps.

```typescript title="Simple server sample"
import {jopiApp} from "jopi-rewrite";

// Start the app.
//
// Doing this allows registering handlers
// for when the app exists, for cleanup.
//
jopiApp.startApp(jopiEasy => {
    // Create a website.
    jopiEasy.new_webSite("http://127.0.0.1")
        // Add a listener for http://127.0.0.1:3000/welcome
        .add_path("/welcome")
        // ... which response to GET.
        .onGET(async req => req.htmlResponse("hello world"))
        .DONE_add_path();

    // Jopi Rewrite support multi-website.
    jopiEasy.new_webSite("http://127.0.0.1:8080");
});
```

### Enable HTTPS

Jopi Rewrite can manage several websites at the same time, and each of them
can have its own SSL certificate.  
To enable HTTPS, you need two things:

* Define an address with https.
* Provide the path to both parts of the SSL certificate.

```typescript
const myWebSite = new WebSite("https://127.0.0.1", {
    certificate: {
        key: "./my-cert.key",
        cert: "./my-cert.crt.key"
    }
});
```

:::info
Jopi Rewrite allows having websites using http mixed with websites using https. You can also have a website listening on port 3000 and another on port 5000, Jopi Rewrite will handle all this internally.
:::

### Dev SSL certificate

Jopi Rewrite lets you generate SSL certificates for development, which allows you to use https on your development machine.

```typescript
import {JopiServer, WebSite} from "jopi-rewrite";

const server = new JopiServer();
const myCertificate = await server.createDevCertificate("127.0.0.1");
const myWebSite = new WebSite("https://127.0.0.1", { certificate: myCertificate });
```

:::warning
The mkcert tool is used internally to generate these certificates and install
a root certificate. An error will occur if this tool is not installed
and accessible globally.
:::

## Responding to requests

JopiRewrite uses a router to respond to requests. This router allows you to associate
a URL pattern with a function that will handle this URL.

```typescript
// For http//127.0.0.1/
myWebSite.onGET("/", req => req.htmlResponse("Hello"));

// In the same way, you can use:
// onGET, onPOST, onPUT, onDELETE, onPATCH, onOPTIONS.
//
myWebSite.onPOST("/", req => req.htmlResponse("Hello"));

// You can use an array for the path.
myWebSite.onGET(["/hello", "/hi"], req => req.htmlResponse("Hello"));

// Warning: http//127.0.0.1/hello
// and http//127.0.0.1/hello/ aren't the same url !
myWebSite.onGET(["/hello", "/hello/"], req => req.htmlResponse("Hello"));

// You can use wildcards.
myWebSite.onGET("/products/*", req => req.htmlResponse("a product"));
myWebSite.onGET("/products/*/details", req => req.htmlResponse("details of a product"));

// You can use named paths.
myWebSite.onGET("/products/:productName", req =>
    req.htmlResponse("Product is:" + req.urlParts["productName"]));

myWebSite.onGET("/products/:productName/details", req =>
    req.htmlResponse("Product listing of:" + req.urlParts["productName"]));

// The wildcards ** allow to catch all.
// --> A simple "*" replaces only one segment
// --> A double "**" replaces all segments.
//
// It means that here we catch all the GET requests.
myWebSite.onGET("/**", req => req.htmlResponse("Hello"));

// It's the same idea, we catch all requests starting with /products.
// Ex: http//127.0.0.1/product/my-product/info
myWebSite.onGET("/products/**", req => req.htmlResponse("Hello"));

myWebSite.onGET("/products/*/details", req => req.htmlResponse("details of a product"));

```

### Async response

The route expects a `Response` object or a `Promise<Response>` as a response. Both are accepted.

```typescript
myWebSite.onGET("/", async req => {
    await pause(2000);
    return req.htmlResponse("Hello");
});
```

### Return a JSON

```typescript
myWebSite.onGET("/my-json", req => req.jsonResponse({"value": 5}));
```

### Template for 404 (not-found)

Jopi Rewrite allows you to define a template for 404 pages to customize them.

```typescript

// Returns a 404 page.
myWebSite.onGET("/not-found", req => req.error404Response());

// Define the template for 404 pages.
//highlight-next-line
myWebSite.on404(req=> req.html("My not-found page content", 404));

```

### Template for 500 (error)

Jopi Rewrite allows you to define a template for 500 pages to customize them.
This 500 page will automatically be displayed in case of an error.

```typescript
// Returns a 500 page.
myWebSite.onGET("/error", req => req.error500Response("optional error info"));

// Define the template for the 500 page.
//highlight-next-line
myWebSite.on500((req, error)=> req.html("My error page content<br/>" + error?.toString(), 500));
```

## Middlewares

A middleware is something that intercepts requests by inserting itself between the reception of the request by Jopi Rewrite and the processing function you have defined.

Doing this can allow several interesting things, such as controlling the IP addresses allowed to access the website, or recording logs to know who accesses which resources.

Jopi Rewrite also supports middlewares that run after the request.  
For example, to measure the execution time of the request, as in the example above.

```typescript
import {JopiRequest, JopiServer, WebSite} from "jopi-rewrite";

const server = new JopiServer();
const myWebSite = new WebSite("http://127.0.0.1");

const middlewareA = (req: JopiRequest) => {
    // customData allows storing data inside the request.
    req.customData.startTime = Date.now();
    return null;
}

const middlewareB = (req: JopiRequest) => {
    const ip = req.requestIP;
    console.log("Request IP:", req.requestIP?.address + " (family:" + ip?.family + ")");

    if (!req.isFromLocalhost) {
        // When middleware returns a response,
        // then the request processing stops here
        // and this response is returned to the caller.
        return req.htmlResponse("forbidden", 403);
    }

    return null;
}

const postMiddlewareA = (req: JopiRequest, res: Response) => {
    const startTime = req.customData.startTime;
    const timeDiff = Date.now() - startTime;
    console.log("Request took", timeDiff, "ms to execute");
    return res;
}

const myRequestHandler = (req: JopiRequest) => req.htmlResponse("Hello !")

// When a request occurs, middlewareA is automatically executed.
myWebSite.addMiddleware(middlewareA);
// ... after that middlewareB is executed.
myWebSite.addMiddleware(middlewareB);

// ... once done, it's our request handler.
myWebSite.onGET("/", myRequestHandler);

// ... it's now our post-middleware.
myWebSite.addPostMiddleware(postMiddlewareA);

server.addWebsite(myWebSite);
server.startServer();
```

## Request timeout

Jopi Rewrite includes a mechanism to kill requests that take too long
to execute, which helps prevent anomalies where an infinite loop occurs.
This mechanism is enabled when DDOS protections are in place, and limits requests
to 2 minutes of execution time. In other cases, it is not enabled. You can
however enable it manually if you are interested in this mechanism, through a middleware.

```typescript
import {JopiServer, Middlewares, WebSite} from "jopi-rewrite";

const server = new JopiServer();
const myWebSite = new WebSite("http://127.0.0.1");
//highlight-next-line
myWebSite.addMiddleware(Middlewares.requestTimeout_sec(2)); // 2 seconds max
server.addWebsite(myWebSite);
server.startServer();
```

If this time is too short, the request can decide to extend this time.

```typescript
myWebSite.onGET("/**", req => {
    req.extendTimeout_sec(5000);
    return req.htmlResponse("I'm taking a lot of time ...")
});
```

## DDOS protection

### What is a DDOS attack?

DDOS attacks are attacks whose goal is to break a server by exhausting its resources. Either by bombarding it so that it has too much workload,
or by occupying its resources with very slow requests.

Jopi Rewrite includes mechanisms to protect against both types of problems:
* It detects IP addresses that come back too often.
* Requests that are intentionally slow to saturate our capacity.

Jopi Rewrite protects itself from fast attacks by maintaining a registry of the latest
IP addresses encountered. This registry is regularly cleared and mainly allows
to know how many times an IP has called us during the last time interval.
If this value is too high, then we block the request.

Protection against slow attacks works differently. The difficulty
with these attacks is that they operate before the first call to JavaScript, at the
internal code level. The reason is that these attacks, called slowloris, work by
very slowly sending the request *header*.

On this point, *bun.js* is the only *node.js*-compatible server to offer effective protection.
It allows interrupting a request if it takes too long to execute,
by counting the time from the very beginning of the processing of this request.

### Enable DDOS protection

DDOS protection is disabled by default, you will need to enable it manually. The system
is slightly slower when this protection is enabled, because it has to manage a registry
of IP addresses.

```typescript
import {JopiServer, WebSite, Middlewares} from "jopi-rewrite";

myWebSite.addMiddleware(Middlewares.ddosProtection({
    // There are a lot of options here
    // but using defaults is ok for most websites.
    
    // It's optional, it allows us to hook how black requests are handled.
    // (the default behavior is to do nothing)
    //
    onBlackRequest(req) {
        console.log("Black request detected from IP", req.requestIP);
        return new Response("Too many requests", { status: 429 });
    }
}));
```