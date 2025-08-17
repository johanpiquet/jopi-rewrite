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
import {getInMemoryCache, JopiServer, WebSite} from "jopi-rewrite";

// Our cache. It stores all data in memory.
const cache = getInMemoryCache();

// Create the server.

const server = new JopiServer();
const myWebSite = server.addWebsite(new WebSite(
    "http://127.0.0.1", 

    // The server options.
    {
        // This is where we set the cache to use.
        cache: cache
    }
));

server.startServer();

// "/**" allows catching all the requests.
myWebSite.onGET("/**", async req => {
    // Get the resource from the cache.
    let res = await req.getFromCache(true);

    // Not in the cache?
    if (!res) {
        // We create the content.
        // Here it shows the current date/hour/seconds.
        res = req.htmlResponse("Date is " + new Date().toLocaleString());

        // Now we add this content to the cache.
        res = await req.addToCache_Compressed(res);
    }

    // Now we return the response.
    return res;
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
import {getInMemoryCache, JopiServer, WebSite, ServerFetch} from "jopi-rewrite";

const myCache = getInMemoryCache();
const server = new JopiServer();

const myWebSite = server.addWebsite(
    new WebSite("http://127.0.0.1:3000", {cache: myCache}));

// The main difference is here.
// It allows configuring a tool which will help us
// to get the page from the Mozilla website.
//
//highlight-start
myWebSite.addSourceServer(new ServerFetch({
    useHostname: "developer.mozilla.org",
    usePort: 443
}));
//highlight-end

server.startServer();

myWebSite.onGET("/**", async req => {
    let res = await req.getFromCache();

    if (!res) {
        console.log("Adding page", req.urlInfos.toString(), "to cache");

        // We only need this line of code to get the page from mozilla.
        // The target url is automatically calculated for us.
        res = await req.fetchServer();

        res = await req.addToCache_Compressed(res);
    }

    return res;
});
```

That's it, you can now open your browser at the address `http://127.0.0.1` and test.

## The different caches

### InMemoryCache

In the previous example, we used the `InMemoryCache`.
It is a cache that keeps all data in memory.

You can configure its default behaviors using the `initMemoryCache` method.

```typescript
import {getInMemoryCache, initMemoryCache, ONE_KILO_OCTET, ONE_MEGA_OCTET} from "jopi-rewrite";

initMemoryCache({
    // Don't add if the resource size is more than 600 KB.
    maxContentLength: ONE_KILO_OCTET * 600,

    // Only store 1000 resources.
    maxItemCount: 1000,

    // Limit the total size to 10 MB.
    // (it's only for the resource, size of meta isn't counted).
    //
    maxMemoryUsage_mo: ONE_MEGA_OCTET * 10
});

// We have only one instance of InMemoryCache which is shared with all our websites.
// (it's the only cache engine which is shared)
//
const myCache = getInMemoryCache();
```
:::info
When the memory limit is reached, or the maximum number of allowed items, then a garbage collector runs. If the problem is a lack of memory, it will start by deleting the items taking up the most memory. If the problem is too many entries, it will start by deleting the least requested items.
:::

### SimpleFileCache

The `SimpleFileCache` stores all its data on the hard disk. It keeps nothing in memory.

```typescript
import {SimpleFileCache} from "jopi-rewrite";

// The only parameter is where to store the files.
// (the target directory is automatically created if missing)
//
const myCache = new SimpleFileCache("./temp/cache");
```

### WebSiteMirrorCache

The `WebSiteMirrorCache` is a special cache because it builds a static site as resources are cached. If you open the cache directory and look at its contents, you will have the equivalent of a downloaded site that you can browse locally.

This cache offers a very interesting option allowing you to modify the content of HTML pages before saving them.
This allows you to modify URLs to make them relative URLs.

The following example allows you to create a fully local version of the Mozilla site, where the URLs to resources are converted to internal URLs.

```typescript
const urlToTransform = "https://developer.mozilla.org/";
const urlReplaceBy = "/"

// rewriteHtml will be called by WebSiteMirrorCache every time an HTML page is found.
function rewriteHtml(html: string, _webSite: WebSite) {
    // HTMLRewriter is exposed by Bun.js.
    // It's a high performance page parser.
    const rewriter = new HTMLRewriter();

    // transformUrl will be called every time something like <a href="..."></a> is found.
    rewriter.on("a", { element(node) { transformUrl("href", node); } });

    // The same for the others.
    rewriter.on("img", { element(node) { transformUrl("src", node); }});
    rewriter.on("script", { element(node) { transformUrl("src", node); }});
    rewriter.on("link", { element(node) { transformUrl("href", node); }});

    return rewriter.transform(html);
}

// Transform a url.
function transformUrl(propName: string, node: HTMLRewriterTypes.Element) {
    let url = node.getAttribute(propName);
    if (!url) return;

    if (url.startsWith(urlToTransform)) {
        url = url.substring(urlToTransform.length);
        url = urlReplaceBy + url;
        node.setAttribute(propName, url);
    }
}

// Our cache.
// We give it the directory where we want to store the file
// and our function whose role is to rewrite the url.
//
const myCache = new WebSiteMirrorCache("./temp/cache-mirror-mozilla", rewriteHtml);
```

You can now browse from the URL `http://127.0.0.1` and navigate this mirror of the Mozilla site, then go to the folder `./temp/cache-mirror-mozilla`
and open the file `index.html` in your browser.

### ChainedCache

The `SimpleFileCache` is often used with an `InMemoryCache`. The idea is that the `InMemoryCache` will automatically keep the most requested resources in memory, while the `SimpleFileCache` will be consulted for entries that are not in memory.

Being able to do this is the role of `ChainedCache`.

```typescript
import {getInMemoryCache, ChainedCache, SimpleFileCache} from "jopi-rewrite";

const inMemoryCache = getInMemoryCache();
const fileCache = new SimpleFileCache("./cache");
const chainedCache = new ChainedCache(inMemoryCache, fileCache);

// It's the cache to use with our server.
const myCache = chainedCache;
```

## Metadata

The cache allows you to associate metadata with each cache entry. These are JSON data whose use is free, you can put whatever you want. The advantage of this metadata is that they are deleted with the cache entries they correspond to.

```typescript
// Get the meta corresponding to the current page.
let resMeta = await req.getCacheMeta();

// Or get the meta of another page.
resMeta = await req.getCacheMeta(new URL("http://127.0.0.1/my-page"));

// addToCache_Compressed allows a second parameter
// in order to set meta-data for our page.
await req.addToCache_Compressed(res, {"some": "data", "about": "this resource"});
```

## Using a sub-cache

A sub-cache allows you to set up a separate cache for each user. If you have an e-commerce site whose items have different prices depending on the customer's profile, then using a sub-cache can be a good idea.

The logic of using a sub-cache is as follows: when you are on a particular URL
(the shopping cart, the customer's profile page, etc.) then you use a sub-cache to store a cache that will be dedicated to this customer.

Here is a complete example to illustrate this principle:

```typescript
import {getInMemoryCache, JopiServer, WebSite} from "jopi-rewrite";

const memoryCache = getInMemoryCache();

const server = new JopiServer();
const myWebSite = server.addWebsite(
    new WebSite("http://127.0.0.1", {cache: memoryCache}));

server.startServer();

// The page for which we need a cache per user.
const urlForUserCache = ["/card", "/card/**", "/user", "/user/**"];

myWebSite.onGET(urlForUserCache, async req => {
    // If this cookie is set, then it means the user is logged in.
    const userLogin = req.getCookie("conected-user-login");

    if (userLogin) {
        // This allows to create a sub-cache compatible with the current cache.
        const subCache = req.getSubCache(userLogin);

        // Ask to use this sub-cache for this request.
        // (and only this request)
        req.useCache(subCache);
    }

    // >>> Here it's what we already know.
    
    let res = await req.getFromCache(true);

    if (!res) {
        res = await req.fetchServer();
        req.addToCache_Compressed(res)
    }

    return res;
});
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