# Using page cache

## What will you see?

Jopi Rewrite can be used to create a powerful caching system. It can cache the HTML of a page, as well as its resources (scripts, CSS, images, etc.).

## Two uses for the cache

The use of a cache can be done in two cases:
- Local cache: our server is the one generating the pages, and we cache some of our pages.
- Proxy cache: our server is an intermediary, which will cache the pages of another server to speed it up.

In both cases, the logic will be the same, only the way the content is generated will change.

## Example of local cache

Here we will create a server that displays the date and time.  
The result will be cached, which will allow us to see how the logic works.

```typescript
import {jopiApp} from "jopi-rewrite";

jopiApp.startApp(import.meta, jopiEasy => {
    jopiEasy.new_webSite("http://127.0.0.1")
        .add_cache().use_inMemoryCache().END_add_cache()

        .add_path_GET("/", async req => {
            let res = await req.getFromCache();

            if (!res) {
                res = req.textResponse(new Date().toISOString());
                res = await req.addToCache(res);
            }

            return res;
        })
});
```

If you run this program and navigate to the URL `http://127.0.0.1`, you will see the date and time appear.
However, if you refresh the page, you will see that nothing changes: this shows that the page comes from the cache
that we have just set up.

## Example of proxy cache

Here we will create a proxy, that is, a tool that sits between the browser and the server.
The purpose of this proxy is to cache the pages in order to reduce the load on the server.

The logic is as follows:
1- The browser requests a page.  
2- Our proxy receives this request.  
3- If it has the page in its cache, it returns it.  
4- Otherwise, it requests the page from the server.  
5- Then it puts it in its cache.  
6- Before returning it to the browser.  

Here, as an example, we will cache the pages of the site `https://developer.mozilla.org`. We will browse on a local address `http://127.0.0.1` while our cache will request the pages from the Mozilla site.

The logic will be the same as for the previous example, only the server configuration will change slightly.

```typescript
import {jopiApp} from "jopi-rewrite";

jopiApp.startApp(import.meta, jopiEasy => {
    jopiEasy.new_webSite("http://127.0.0.1")
        .add_sourceServer()
            .useOrigin("https://developer.mozilla.org")
            .END_add_sourceServer()

        .add_cache().use_inMemoryCache().END_add_cache()

        .add_path_GET("/**", async req => {
            let res = await req.fetchServer();

            if (!res) {
                res = req.textResponse(new Date().toISOString());
                res = await req.addToCache(res);
            }

            return res;
        })
});
```

That's it, you can now open your browser at the address `http://127.0.0.1` and test.

## The file cache

In the previous example, we used the `InMemoryCache`. It is a cache that keeps all data in memory. He is shared between all website instance which allow to be more efficient.

Another cache is the `SimpleFileCache` which stores all its data on the hard disk. It keeps nothing in memory.

```typescript
jopiEasy.new_webSite("http://127.0.0.1")
        .add_cache()
            .use_fileSystemCache("myCacheDir")
            .END_add_cache()
```

## Using a sub-cache

A sub-cache allows you to set up a separate cache for each user. If you have an e-commerce site whose items have different prices depending on the customer's profile, then using a sub-cache can be a good idea.

The logic of using a sub-cache is as follows: when you are on a particular URL
(the shopping cart, the customer's profile page, etc.) then you use a sub-cache to store a cache that will be dedicated to this customer.

Here is a complete example to illustrate this principle:

```typescript
import {jopiApp, JopiRequest} from "jopi-rewrite";

// The page for which we need a cache per user.
const urlForUserCache = ["/card", "/card/**", "/user", "/user/**"];

jopiApp.startApp(import.meta, jopiEasy => {
    jopiEasy.new_webSite("http://127.0.0.1")
        .add_cache().use_inMemoryCache().END_add_cache()

        // Use the main cache.
        .add_path_GET("/**", defaultHandler)

        .add_path_GET(urlForUserCache, async req => {
            // If this cookie is set, then it means the user is logged in.
            const userLogin = req.getCookie("conected-user-login");

            if (userLogin) {
                // This allows creating a sub-cache compatible with the current cache.
                const subCache = req.getSubCache(userLogin);
            }

            return defaultHandler(req);
        })
});

const defaultHandler = async (req: JopiRequest) => {
    let res = await req.fetchServer();

    if (!res) {
        res = req.textResponse(new Date().toISOString());
        res = await req.addToCache(res);
    }

    return res;
};
```

## Avoiding cache poisoning

### The problem

Most caching solutions are sensitive to cache poisoning issues.
To understand what cache poisoning is, let's look at the following script:

```typescript
for (let i=0;i<99999999;i++) {
    // Call our website with:
    //      http://127.0.0.1?a=0
    //      http://127.0.0.1?a=1
    //      http://127.0.0.1?a=2
    //      ...
    fetch("http://127.0.0.1?a=" + i);
}
```

So far, the way we have built our cache means that
we do not filter the search-params. For this reason, we will have
99999999 duplicates of our page in the cache: which will be a disaster.

Poisoning a cache can also be done using 404 pages, as the following script does:

```typescript
for (let i=0;i<99999999;i++) {
    // Call our website with:
    //      http://127.0.0.1/not-found-0
    //      http://127.0.0.1/not-found-1
    //      http://127.0.0.1/not-found-2
    //      ...
    fetch("http://127.0.0.1/not-found-" + i);
}
```

These two cases illustrate the main methods of cache poisoning. When you set up a cache, you must absolutely protect yourself against poisoning attacks, otherwise your server's resources will be exhausted and everything will go wrong.

### How to avoid poisoning?

The way to avoid cache poisoning will depend on your website and its structure: whether it's a small site or a very large site. Jopi Rewrite offers tools to help you, but the final solution will depend on your project and the strategy you will adopt.

This strategy will generally be one of the following:

- By search-params (what comes after the `?` in the URL).
    - **Remove search-params** which avoids the first type of attack.  
    This is a radical and effective solution, but can become problematic.

    - **Filter possible values** which must be done for each type of URL.  
    We will see how to do this more easily.

- For 404 page attacks.
    - **Do not cache 404 pages** which presents a risk.  
    Because the origin server can be a fragile server, not very resistant to heavy loads.  
    In this case, you must absolutely activate the DDOS protection that Jopi Rewrite provides!

    - **Have an exhaustive list of all the pages that exist on your site.**  
    Which can be simple for a small site, but complicated for a larger site.

### The filterSearchParams tool

To help you, Jopi Rewrite offers a function called `filterSearchParams`
which allows you to filter search-params. Its role is to indicate which parameters are allowed in a URL, and which values are allowed for these parameters.

```typescript
// We create a filter allowing only hello, sort and query params.
// (myFilter can be created once and reused every time)
const myFilter = buildSearchParamFilter({}, {
    // The values authorized for the param named hello.
    // Allow : http://127.0.0.1?hello=world
    // Reject: http://127.0.0.1?hello=boom
    hello: {values: ["world", "you", "jopi"]},

    // The same for the sort param, which only accepts one value.
    sort: {values: ["asc"]},

    // Doing this is dangerous but sometimes it's required.
    // When you have this, you must not put the page in cache!
    query: {allowAllValues: true}
});

// We apply this filter on our current request.
// After this call, the current url will be cleaned and filtered.
req.filterSearchParams(myFilter);

// Now our cache is safer.
let res = await req.getFromCache();
```

There are many filter options to configure the behaviors of filterSearchParams. The default behaviors of the filter are as follows:
- It sorts all parameters in alphabetical order by their name.  
This allows for unique URLs, even if the order of parameters
is different between two URLs.
- It converts all values to lowercase.
- If two parameters have the same name, only the first is kept.