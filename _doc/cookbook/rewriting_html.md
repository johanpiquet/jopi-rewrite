# Rewriting HTML

## Modify HTML

Jopi Rewrite offers tools to modify the HTML returned by a response.
You can do this in two different ways: either in the request that creates the result, or through a middleware that will analyze all content.

```typescript
import {JopiServer, ServerFetch, WebSite} from "jopi-rewrite";

const server = new JopiServer();

const myWebSite = new WebSite("http://127.0.0.1");
myWebSite.addSourceServer(ServerFetch.useOrigin("http://127.0.0.1:8080"));
server.addWebsite(myWebSite);
server.startServer();

myWebSite.addPostMiddleware(async (req, res) => {
    // We alter the html directly from a post-middleware.
    res = await req.hookIfHtml(res, (html)=> {
        return html.replaceAll("Hello", "Hi");
    });

    return res;

});

myWebSite.onGET("/**", async req => {
    const res = await req.directProxyToServer();

    // We alter the html directly from our request handler.
    return req.hookIfHtml(res, (html)=> {
        return html.replaceAll("Goodbye", "Bye");
    });
});
```

## Server Side JQuery

Jopi Rewrite allows you to use JQuery on the server side to select parts of the HTML and replace them. This feature makes working with HTML much easier!

```typescript
myWebSite.onGET("/**", async req => {
    const res = await req.directProxyToServer();

    // We alter the html directly from our request handler.
    return req.hookIfHtml(res, (html) => {
        const $ = req.asJquery(html);
        const $found = $(".label-wrapper.mfn-menu-label-wrapper > .menu-label").first();

        $found.html("Hello from Jopi Rewrite !");
        $found.reactReplaceContentWith(<div>You can also use ReactJS !</div>);

        // Return the updated HTML.
        return $.html();

    });
});
```

## Fast HTML parser

If you need a way to parse HTML very quickly, you can use `HTMLRewriter` (it's a Bun.js only feature). It is extremely fast, but it does not have the flexibility of JQuery to find and replace specific areas in the HTML.

```typescript
const myRewriter = new HTMLRewriter();

// Replace all anchor targets.
myRewriter.on("a", {
    element(node) {
        console.log("href -->", node.getAttribute("href"));
        node.setAttribute("href", "https://www.google.com");
    }
});

myWebSite.onGET("/**", async req => {
    const res = await req.directProxyToServer();

    // We alter the html directly from our request handler.
    return req.hookIfHtml(res, (html) => {
        //highlight-next-line
        return myRewriter.transform(html);
    });
});
```

## Manually transform HTML

The following example highlights another way to transform HTML, which is less useful and less simple.

```typescript
myWebSite.onGET("/**", async req => {
    let res = await req.directProxyToServer();
    
    //highlight-next-line
    if (req.isHtml(res)) {
        if (req.hasCookie("user-name")) {
            const userName = req.getCookie("user-name")!;
            //highlight-next-line
            let html = await req.reqBodyAsText();
            html = html.replaceAll("%user-name", userName);
            //highlight-next-line
            res = req.htmlResponse(html);
        }
    } else if (req.isJson(res)) {
        console.log("Response is json !");
    }
    
    return res;
});
```