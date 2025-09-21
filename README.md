📚 [Documentation](#documentation) - 🚀 [Tutorials](#tutorials) - 💬 [Discord](#discord)

Jopi Rewrite is a framework for *node.js* and *bun.js* that integrates a set of technologies to build powerful server applications.
It's very simple to use: that is its strength. And it's very fast (optimised for the bun.js version).

With Jopi Rewrite you will quickly be able to:

✓ Build a **high-performance** server application.  
✓ Do **React SSR** and **React Hydrate** (like NextJS).  
✓ With file router, where a simple file declares a route and his content (also like NextJS).
✓ Tailwind and PostCSS support pre-configured in the engine.  
✓ Use **JWT Token** for authentification.  
✓ Use **LetsEncrypt** for HTTPS, with autorenew (without restart).  
... all these make very simple through an intent focused API!

But it's not the main point, since with Jopi Rewrite you can also:

✓ Build a **crawler** to convert your site to a static one.
✓ Add **cache** features, to optimize performance.  
✓ Build a smart proxy with **load-balancing**.  

One of the nice things with Jopi Rewrite is **hot reload**. Hot-reload allows updating our code and see your server do
an automatic restart: but without stopping what he is doing. If he is processing requests, then the server will continue
to process them, and in the same time the new version will process the new incoming requests.

✓ **Hot-reload is like with PHP**: you can update your server without breaking what he is currently doing.  
✓ Server update can be done safely, and when you want.  
✓ This without latencies: important things can be kept in memory, like caches.

✓ LetsEncrypt support
  * For free https certificates.
  * With automatic certificate renew.
  * And this, without a server restart required!

✓ Tailwind and PostCSS support
  * Is automatic, no configuration required!
    * Is fast, thanks to a blazing fast compiler!
    * Browser auto-refresh: save and the browser refresh instantly!

# Tutorials

You can found articles and tutorials on my Dev.to page [link](https://dev.to/johanpiquet).

# Discord

You can contact me on Discord. [link](https://discord.com/channels/1397868681253490728/1397868681253490731).

# Documentation

* How to start
    * [Installing Bun.js](_doc/how_to_start/installing_bunjs.md)
    * [Installing JOPIN](_doc/how_to_start/installing_jopin.md)
    * [Creating a project](_doc/how_to_start/creating_a_project.md)
* Build a website with React Server Side
    * [Create a simple website](_doc/reactjs/create_a_website.md)
    * [Using ReactJS](_doc/reactjs/using_reactjs.md)
    * [Using Tailwind CSS](_doc/reactjs/using_tailwind.md)
    * [Using React Page Router](_doc/reactjs/use_page_router.md)
    * [Automatic cache](_doc/reactjs/automatic_cache.md)
* Cookbook
  * [Handling request data](_doc/cookbook/handling_request_data.md)
  * [Using page cache](_doc/cookbook/using_page_cache.md)
  * [Create a reverse proxy](_doc/cookbook/create_a_reverse_proxy.md)
  * [Docker and serverless](_doc/cookbook/docker_and_serverless.md)
  * [Restart without losing connection](_doc/cookbook/restart_without_losing_connection.md)
  * [Rewriting HTML](_doc/cookbook/rewriting_html.md)
  * [Serving files](_doc/cookbook/serving_files.md)
  * [Building a static website](_doc/cookbook/static_web_site.md)
* React Hooks
    * [useExecuteOnce](_doc/hooks/use_execute_once.md)
    * [usePage](_doc/hooks/use_page.md)
    * [usePageTitle](_doc/hooks/use_page_title.md)
    * [useUserInfos / logOut](_doc/hooks/use_user_infos.md)
    * [useCookie / deleteCookie](_doc/hooks/use_cookie.md)
    * [useFormSubmit](_doc/hooks/use_form_submit.md)
    * [useRefresh](_doc/hooks/use_refresh.md)

* Security
    * [Filtering Search Params](_doc/security/filtering-search-params.md)
    * [Enabling CORS](_doc/security/enabling-cors.md)
    * [Using JWT Token](_doc/security/using-jwt-token.md)
    * [Checking user roles](_doc/security/checking-user-roles.md)
* Utilities
    * [Application shutdown helper](_doc/utilities/application-shutdown-helper.md)