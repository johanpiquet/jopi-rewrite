# Static website

Something, you want to be able to transform your website into a static one. To doing it, the strategy of Jopi Rewrite is to use a customizable crawler to download your website. This crawler will automatically discover all the pages of your websites and all his resources (.css, .png, ...) and download it into a anonymous website which can be copy/paste.

> An anonymous website is a website without URL.  
> It can be open and be readable from the filesystem (url of type file:/// in the browser).

Here is a minimal sample, which in most cases will be the only thing needed:

```typescript
import {jopiApp, RefFor_WebSite} from "jopi-rewrite";

jopiApp.startApp(async jopiEasy => {
    await jopiEasy.new_downloader("http://127.0.0.1")
        // www-out is already the default, can be omitted.
        .set_outputDir("www-out")
        .START_DOWNLOAD();
});
```

Here is a full-featured sample:

```typescript
import {jopiApp, RefFor_WebSite} from "jopi-rewrite";

jopiApp.startApp(async jopiEasy => {
    const webSite = new RefFor_WebSite();

    // The website to download.
    jopiEasy.new_webSite("http://127.0.0.1", webSite)
        .add_path_GET("/", async req => {
            console.log("Calling url:", req.url);
            return req.htmlResponse(`
                <a href="http://127.0.0.1/link1">link 1</a>
                <a href="http://127.0.0.1/link2">link 2</a>
            `)
        });

    // The website must be fully initialized.
    await webSite.waitWebSiteReady();

    await jopiEasy.new_downloader("http://127.0.0.1")

        // www-out is already the default, can be omitted.
        .set_outputDir("www-out")

        // Add url than the crawler can omit.
        // (occurs with complex CSS or requested by a script)
        .set_extraUrls(["my-font.ttf"])

        .on_urlProcessed(infos => {
            if (infos.state==="ok") {
                console.log("Must upload this file to the server:", infos.cacheKey);
                console.log("Is url:", infos.sourceUrl);
            }
        })

        .setFilter_canProcessUrl((url, isResource) => {
            return isResource || !url.startsWith("forbidden/");
        })

        // Will not download if the resource is already in cache.
        .setOption_ignoreIfAlreadyDownloaded(true)

        .setFilter_canIgnoreIfAlreadyDownloaded((url, infos) => {
            return (url==="blog") || (url.startsWith("blog/"));
        })

        .START_DOWNLOAD();
});
```

