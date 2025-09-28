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
jopiApp.startApp(import.meta, jopiEasy => {
    jopiEasy.new_webSite("http://127.0.0.1")
        .enable_reactRouter()

        // Enable the page.
        .enable_automaticCache()
            .use_memoryCache()
            .END_use_AutomaticCache()

        .add_path("/")
            .onGET(async req => {
                return req.reactResponse(<div>Date: {new Date().toDateString()}</div>)
            })
});
```

## Controlling the cache

For each route (after the onGET), it's possible to :
* Disable automatic cache for this route (disable_automaticCache)
* Execute a function before taking content from the cache (on_beforeCheckingCache)
* Execute a function before returning the value from the cache (on_afterGetFromCache)
* Execute a function before adding a value to the cache (on_beforeAddToCache)