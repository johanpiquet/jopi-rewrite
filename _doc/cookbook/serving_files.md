# Serving files

Jopi Rewrite allows you to serve files from a directory. You can do it through `req.serveFile`.
It's a basic file server, with memory efficient streaming, but which isn't adapted for video
and big files (the reason being that it doesn't support the http header `Range`).

```typescript
import {JopiServer, WebSite} from "jopi-rewrite";

const server = new JopiServer();
const myWebSite = server.addWebsite(new WebSite("http://127.0.0.1"));
server.startServer();

myWebSite.onGET("/**", req => {
    return req.serveFile("./my-static-website", {
        // Will replace "/index.html" in the browser navbar by "/".
        replaceIndexHtml: true,

        // The default behavior to return "req.error404Response()".
        // Here for this sample, we choose to redirect to the home page.
        onNotFound: req => req.redirectResponse(false, "/")
    });
});
```