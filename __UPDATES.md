**2025-08-02**
* ChainedCache has been removed.
* PageCache: replace webSite by requiredHeaders.
* PageCache.hasInCache added.

**2025-08-03**
* PageCache.getFromCache has now the possibility to update the metadata.
* Page.addToCache has now the possibility to update the existing metadata.
* PageCache is now an interface (and not a class).
* Adding req.hasInCache
* Exposing req.cache & req.mainCache

**2025-08-04**
* webSite.onGET() return a WebSiteRoute
* req.route returns this WebSiteRoute
* Added spyRequest and spyTextResponse
* BUG: hookIfHtml doesn't return previous headers
* BUG: redirect doesn't return the headers.

**2025-08-05**
* Adding CacheRole to PageCache.
* Downgrading ReactJS version from 19 to 18 for compatibility. 
* Upgrading npm module to 1.0.5.
* Adding EsBuild loaders for common types.
* Upgrading npm module to 1.0.6.


**2025-08-08**
* Is now compatible with Node.js (but not CSS with react-hydrate).
* CSS is now compatible with Node.js (need an external loader, will be improved).
* No more need for an external loader.
* Compatible with ReactJS SSR (they was a React bug requiring warming react before installing the loader).

**2025-08-16**
* Improved nodejs loader.
* ... now import woff/jpg/png/...
* ... now resolve files if don't add ".js" at end
* ... now allow importing directory.
* Added HTTPS support for node.js