**2025-08-18**
* Page wrapper for React SSR.
* Inject CSS module into the page.
* Bundle CSS into loader.css + add hash.
* req.reactResponse now wrap response inside a Page.

**2025-08-17**
* Loader is moved to project jopi-loader.
* Added support of CSS module for Node.js (bunjs don't support currently).
* Now EsBuild shares the same css-module loader with bun.js and node.js. 

**2025-08-16**
* Improved nodejs loader.
* ... now import woff/jpg/png/...
* ... now resolve files if don't add ".js" at end
* ... now allow importing directory.
* Added HTTPS support for node.js

**2025-08-08**
* Is now compatible with Node.js (but not CSS with react-hydrate).
* CSS is now compatible with Node.js (need an external loader, will be improved).
* No more need for an external loader.
* Compatible with ReactJS SSR (they was a React bug requiring warming react before installing the loader).

