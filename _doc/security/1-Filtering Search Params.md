When building a cache, it is essential to control the search params (the part after the *?* in the URL).
If you allow any value, it becomes easy to write a script that will poison your cache.

Jopi Rewrite includes features to help you with this.
Here is an example of a filter, using rules to filter search params.

```typescript
import {buildSearchParamFilter, JopiServer, WebSite} from "jopi-rewrite";

const server = new JopiServer();
const myWebSite = server.addWebsite(new WebSite("http://127.0.0.1"));
server.startServer();

// Will filter our home page params.
const searchFilter_HomePage = buildSearchParamFilter({}, {
    // For param "hello", only "world" and "jopi" are accepted as values.
    hello: {values: ["world", "jopi"]}
});

// Will filter our search page params.
const searchFilter_SearchPage = buildSearchParamFilter({}, {
    // For param "sort", only "asc" is accepted.
    sort: {values: ["asc"]},

    // For param "query", all values are accepted.
    // Warning: when this is the case, you must NOT cache the page!
    query: {allowAllValues: true}
});

// We must use one filter per type of page.
myWebSite.onGET("/**", req => {
    const urlBefore = req.urlInfos.toString();
    req.filterSearchParams(searchFilter_HomePage);
    return req.htmlResponse(`Url before: ${urlBefore}<br/>Url after: ${req.urlInfos.toString()}<br/>`);
});

// Add an exception for our search page.
myWebSite.onGET("/search", req => {
    const urlBefore = req.urlInfos.toString();
    req.filterSearchParams(searchFilter_SearchPage);
    return req.htmlResponse(`Url before: ${urlBefore}<br/>Url after: ${req.urlInfos.toString()}<br/>`);
});
```

Here we use two things:
* `buildSearchParamFilter` to create a filter.
* `req.filterSearchParams` to apply the filter.

You will notice two things:
* req.urlInfos is modified after filtering.
* req.url is not modified. It is immutable.
* Unauthorized or invalid search params are removed.
* Search params are sorted in alphabetical order.