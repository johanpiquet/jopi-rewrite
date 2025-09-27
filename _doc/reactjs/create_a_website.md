# Create a website

## More than one WebSite
Jopi Rewrite allows you to create servers exposing multiple websites, which is useful when used as a cache or as a proxy. For this reason, the creation of the server and the creation of the *WebSite* are done in two steps.

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

## Optional parameters to add into package.json

Two parameters inside `package.json` allows setting some important behaviors.

**Sample package.json**
```json
{
  "jopi": {
    "webSiteUrl": "https://my-public-url",
    "webSiteListeningUrl": "http://127.0.0.1:3000"
  }
}
```

### webSiteUrl: allowing transforming import to url

If using custom imports, like importing an image, you must define `webSiteUrl` with the public url of your website.
It allows transforming a local file path to an url pointing to the resource.

For exemple if you have this ```import resPath from "./logo.png";``` then `resPath` is the path to the file
on server (by default) or the url to the resource (if you set the url of your website into `webSiteUrl`).

### webSiteListeningUrl: allowing defining the listening url

`webSiteListeningUrl` allows to not set the url when starting a website.

```typescript
import {jopiApp} from "jopi-rewrite";

jopiApp.startApp(jopiEasy => {
    // Here the website url is not set.
    // It will take the value of webSiteListeningUrl.
    //
    jopiEasy.new_webSite()      // <---
        .add_path("/welcome")
            .onGET(async req => req.htmlResponse("hello world"))
            .DONE_add_path();
});
```





## Enable HTTPS

Jopi Rewrite can manage several websites at the same time, and each of them
can have its own SSL certificate. To enable HTTPS, you need two things:

* Define an address with https.
* Define a SSL certificate.

For that you have three choices:
* Set your own certificat.
* Let Jopi Rewrite generate a dev certificate.
* Ask a LetsEncrypt certificate.

```typescript
// With a local certificat.
jopiEasy.new_webSite("https://127.0.0.1")
    .add_httpCertificate().use_dirStore("certs").DONE_add_httpCertificate()
    .add_path_GET("/", async req => req.htmlResponse("hello HTTPS !"));

// Generating a dev certificate.{
jopiEasy.new_webSite("https://127.0.0.1")
    .add_httpCertificate().generate_localDevCert().DONE_add_httpCertificate()
    .add_path_GET("/", async req => req.htmlResponse("hello HTTPS !"));

// With LetsEncrypt.

jopiEasy.new_webSite("https://127.0.0.1")
    .add_httpCertificate()
        .generate_letsEncryptCert("mymail@gmail.com")
        .enable_production()
        .DONE_add_httpCertificate()
    .add_path_GET("/", async req => req.htmlResponse("hello HTTPS !"));
```

:::info
LetEncrypt are automatically renewed if you are using **bun.js**. It download an new certificate
after 80 days (the max certificat age is 90 days) and it replace the current own, without the
need to restart the server and without connection lost.

This feature doesn't work with node.js, which doesn't have the tecnical prerequist.
:::

## Responding to requests

JopiRewrite uses a router to respond to requests. This router allows you to associate
a URL pattern with a function that will handle this URL.

### Binding to GET / POST /...

```typescript
import {jopiApp} from "jopi-rewrite";

jopiApp.startApp(jopiEasy => {
    jopiEasy.new_webSite("http://127.0.0.1")
        .add_path("/")
            .onGET(async req => req.htmlResponse("A GET request"))
        .add_samePath()
            .onPOST(async req => req.htmlResponse("Received" + JSON.stringify(req.getReqData())))
        .DONE_add_path();
});
```

Here you can also use the `use` function in order to combine GET and POST:

```typescript
import {jopiApp} from "jopi-rewrite";

jopiApp.startApp(jopiEasy => {
    jopiEasy.new_webSite("http://127.0.0.1")
        .add_path("/").use({
            onGET: async req => req.htmlResponse("A GET request"),
            onPOST: async req => req.htmlResponse("Received" + JSON.stringify(req.getReqData()))
        })
});
```

### Using a named path

You can use a named path in order to known the name of the product.
Here you can try http://127.0.0.1/computer/listing for sample.

```typescript
import {jopiApp} from "jopi-rewrite";

jopiApp.startApp(jopiEasy => {
    jopiEasy.new_webSite("http://127.0.0.1")
    // Note the ":" before name.
    .add_path("/products/:name/listing")
    .onGET(async req => req.htmlResponse("Product:" + req.urlParts["name"]))
    .DONE_add_path();
});
````

### Using wildcard

The wildcard `/*` allows catching one level (and only one).

```typescript
import {jopiApp} from "jopi-rewrite";

jopiApp.startApp(jopiEasy => {
    jopiEasy.new_webSite("http://127.0.0.1")
        // Accept http://127.0.0.1/products/
        // Accept http://127.0.0.1/products/listing
        // But not http://127.0.0.1/products
        // And not http://127.0.0.1/products/catagory/all
        //
        .add_path("/products/*")
            .onGET(async req => req.htmlResponse("Path:" + req.url))
            .DONE_add_path();
});
```

The double wildcard `/**` allows catching every level.
It's the most used pattern.

```typescript
import {jopiApp} from "jopi-rewrite";

jopiApp.startApp(jopiEasy => {
    jopiEasy.new_webSite("http://127.0.0.1")
        // Accept http://127.0.0.1/products/
        // Accept http://127.0.0.1/products/listing
        // Accept http://127.0.0.1/products/catagory/all
        // But not http://127.0.0.1/products
        //
        .add_path("/products/**")
            .onGET(async req => req.htmlResponse("Path:" + req.url))
            .DONE_add_path();
        // What is after have priority on wildcard.
        .add_path("/products/special-product").
            .onGET(async req => req.htmlResponse("Special product"))
            .DONE_add_path();
});
```

> The pattern `/**` is used to catch every requests for a website.

### Return a JSON

```typescript
import {jopiApp} from "jopi-rewrite";

jopiApp.startApp(jopiEasy => {
    jopiEasy.new_webSite("http://127.0.0.1")
        .add_path("/json")
        .onGET(async req => req.jsonResponse({myData: 123}))
        .DONE_add_path()
});
```

### Template for 404 (not-found)

Jopi Rewrite allows you to define a template for 404 pages to customize them.

```typescript
import {jopiApp} from "jopi-rewrite";

jopiApp.startApp(jopiEasy => {
    jopiEasy.new_webSite("http://127.0.0.1")
        .add_specialPageHandler()
        .on_404_NotFound(async req => req.htmlResponse("My not-found page content", 404))
        .END_add_specialPageHandler()

        // Sample showing how to return a 404.
        .add_path_GET("/", async req => req.returnError404_NotFound())
});
```

> You can do the same thing for page 500 (error) and 401 (unauthorized).

## Middlewares

A middleware is something that intercepts requests by inserting itself between the reception of the request by Jopi Rewrite and the processing function you have defined.

Doing this can allow several interesting things, such as controlling the IP addresses allowed to access the website, or recording logs to know who accesses which resources.

Jopi Rewrite also supports middlewares that run after the request.  
For example, to measure the execution time of the request, as in the example above.

```typescript
import {jopiApp, JopiRequest} from "jopi-rewrite";

const middlewareA = (req: JopiRequest) => {
    // 'customData' allows storing data inside the request.
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

jopiApp.startApp(jopiEasy => {
    jopiEasy.new_webSite("http://127.0.0.1")
        .add_middleware()
            // When a request occurs,
            // middlewareA is automatically executed
            // before the request handler.
            .use_custom(middlewareA)

            //middlewareB will be executed after middlewareA.
            .use_custom(middlewareB)
        .END_add_middleware()

        .add_postMiddleware().
            // Post-middleware is executed before returning the response.
            // It allows altering this response.
            use_custom(postMiddlewareA)
        .END_add_postMiddleware()

        // Sample showing how to return a 404.
        .add_path_GET("/", async req => req.htmlResponse("sample"))
});
```

## Request timeout

Jopi Rewrite includes a mechanism to kill requests that take too long
to execute, which helps prevent anomalies where an infinite loop occurs.
This mechanism is enabled when DDOS protections are in place, and limits requests
to 2 minutes of execution time. In other cases, it is not enabled. You can
however enable it manually if you are interested in this mechanism, through a middleware.

> This feature is only available for bun.js

```typescript
import {jopiApp, Middlewares} from "jopi-rewrite";

jopiApp.startApp(jopiEasy => {
    jopiEasy.new_webSite("http://127.0.0.1")
        .hook_webSite(website => {
            // 2 seconds max
            website.addMiddleware(Middlewares.requestTimeout_sec(2));
        })

        // Sample showing how to return a 404.
        .add_path("/")
            .onGET(async req => {
                // We can extend the timeout manually.
                req.extendTimeout_sec(5);

                // Pause of 10 seconds.
                await NodeSpace.timer.tick(10 * 1000);

                return req.htmlResponse("I will be interupted before ...")
            })
            .DONE_add_path()
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
import {jopiApp, Middlewares} from "jopi-rewrite";

jopiApp.startApp(jopiEasy => {
    jopiEasy.new_webSite("http://127.0.0.1")
        .hook_webSite(website => {
            website.addMiddleware(Middlewares.ddosProtection({
                onBlackRequest(req) {
                    console.log("Black request detected from IP", req.requestIP);
                    return req.error500Response();
                }
            }));
        })
});
```