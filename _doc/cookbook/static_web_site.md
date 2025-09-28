# Static website

Sometimes, you want to be able to transform your website into a static one. To do it, the strategy of Jopi Rewrite is to use a customizable crawler to download your website. This crawler will automatically discover all the pages of your websites and all his resources (.css, .png, ...) and download it as an anonymous website which can be copy/paste.

> An anonymous website is a website without adherence to a URL.  
> It can be open and be read from the filesystem (url of type file:/// in the browser).

Here is a minimal sample, which in most cases will be the only thing needed:

```typescript
import {jopiApp, RefFor_WebSite} from "jopi-rewrite";

jopiApp.startApp(import.meta, async jopiEasy => {
    await jopiEasy.new_downloader("http://127.0.0.1")
        // www-out is already the default, can be omitted.
        .set_outputDir("www-out")
        .START_DOWNLOAD();
});
```

Here is a full-featured sample:

```typescript
import {jopiApp, RefFor_WebSite} from "jopi-rewrite";

jopiApp.startApp(import.meta, async jopiEasy => {
    
    // >>> >>> Create the website to download.
    
    const webSite = new RefFor_WebSite();
    
    jopiEasy.new_webSite("http://127.0.0.1", webSite)
        .add_path_GET("/", async req => {
            console.log("Calling url:", req.url);
            return req.htmlResponse(`
                <a href="http://127.0.0.1/link1">link 1</a>
                <a href="http://127.0.0.1/link2">link 2</a>
            `)
        });

    // >>> >>> Do the download.
    
    // The website must be fully initialized.
    await webSite.waitWebSiteReady();

    await jopiEasy.new_downloader("http://127.0.0.1")

        // www-out is already the default, can be omitted.
        .set_outputDir("www-out")

        // Add url than the crawler could have missed.
        // (occurs with complex CSS or when requested by a script)
        .set_extraUrls(["my-font.ttf"])

        // Is called when an url have been processed.
        // (downloaded or ignore du to our custom strategy)
        .on_urlProcessed(infos => {
            if (infos.state==="ok") {
                console.log("Must upload this file to the server:", infos.cacheKey);
                console.log("Is url:", infos.sourceUrl);
            }
        })

        // Allow ignoring some urls.
        .setFilter_canProcessThisUrl((url, isResource) => {
            return isResource || !url.startsWith("forbidden/");
        })

        // Allow defining url which must be downloaded and analyzed
        // event if already in cache.
        .setFilter_canIgnoreIfAlreadyDownloaded((url, infos) => {
            return (url==="blog") || (url.startsWith("blog/"));
        })
        
        // Will not download if the resource is already in cache.
        // Is automatically set to true if 'setFilter_canIgnoreIfAlreadyDownloaded' is set.
        .setOption_ignoreIfAlreadyDownloaded(true)

        .START_DOWNLOAD();
});
```

