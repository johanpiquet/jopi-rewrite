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