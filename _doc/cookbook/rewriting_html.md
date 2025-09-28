# Rewriting HTML

## Modify HTML

Jopi Rewrite offers tools to modify the HTML returned by a response.
You can do this in two different ways: either in the request that creates the result, or through a post-middleware.

Example: the request handler alters himself the HTML.

```typescript
import {jopiApp} from "jopi-rewrite";

jopiApp.startApp(import.meta, jopiEasy => {
    jopiEasy.new_webSite("http://127.0.0.1")
        .add_sourceServer()
        .useOrigin("http://127.0.0.1:8080")
        .END_add_sourceServer()
        .add_path_GET("/**", async req => {
            const res = await req.directProxyToServer();

            // We alter the HTML directly from our request handler.
            return req.hookIfHtml(res, (html)=> {
                return html.replaceAll("Goodbye", "Bye");
            });
        })
})
```

Example: using a post-middleware for altering HTML.

```typescript
import {jopiApp} from "jopi-rewrite";

jopiApp.startApp(import.meta, jopiEasy => {
    jopiEasy.new_webSite("http://127.0.0.1")
        .add_sourceServer().useOrigin("http://127.0.0.1:8080").END_add_sourceServer()
        .add_postMiddleware().use_custom(async (req, res) => {
            return req.hookIfHtml(res, (html) => {
                return html.replaceAll("Goodbye", "Bye");
            })
        })
        .END_add_postMiddleware()
        .add_path_GET("/**", async req => req.directProxyToServer())
})
```

## Server Side JQuery

Jopi Rewrite allows you to use `JQuery` on the server side to select parts of the HTML and replace them.
This feature makes working with HTML much easier!

```typescript
return req.hookIfHtml(res, (html) => {
    const $ = req.asJquery(html);
    const $found = $(".label-wrapper.mfn-menu-label-wrapper > .menu-label").first();

    $found.html("Hello from Jopi Rewrite !");
    $found.reactReplaceContentWith(<div>You can also use ReactJS !</div>);

    // Return the updated HTML.
    return $.html();
});
```

## Fast HTML parser

If you need a way to parse HTML very quickly, you can use `HTMLRewriter` (it's a Bun.js only feature). It is extremely fast, but it does not have the flexibility of JQuery to find and replace specific areas in the HTML.

```typescript
return req.hookIfHtml(res, (html) => {
    const myRewriter = new HTMLRewriter();

    // Replace all anchor targets.
    myRewriter.on("a", {
        element(node) {
            console.log("href -->", node.getAttribute("href"));
            node.setAttribute("href", "https://www.google.com");
        }
    });

    // ...

    return req.hookIfHtml(res, (html) => myRewriter.transform(html));
});
```