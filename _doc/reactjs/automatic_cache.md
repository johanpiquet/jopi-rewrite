# Automatic Cache

## What is it?

To make your website as fast as possible, you can enable automatic cache for website
which content is essentially static.

The cache will automatically store the rendered page in memory, or to files, and server it from this, to avoid calculating this page content.

## How to enable it?

Here is a sample on how to enable it.

Here we use a simple configuration option to enable the cache globally
which will include all the page requested thought a GET request. 

```typescript jsx
jopiApp.startApp(jopiEasy => {
    jopiEasy.new_webSite("http://127.0.0.1")
        .enable_reactRouter(import.meta)

        // Enable the page.
        .enable_automaticCache()
            .use_memoryCache()
            .END_use_AutomaticCache()

        .add_path("/")
            .onGET(async req => {
                return req.reactResponse(<div>Date: {new Date().toDateString()}</div>)
            })
            // Uncomment to disable automatic cache for this page.
            //.disable_automaticCache()
});
```

## Clearing and controlling the cache

Currently, there is no mechanism with automatic cache allowing to controller finely what to add to the cache and how to add it.

If you are using an in-memory cache, like here, you will need to restart to clear the cache.

If you are using file cache, you only need to delete the cache directly, without a restart needed.