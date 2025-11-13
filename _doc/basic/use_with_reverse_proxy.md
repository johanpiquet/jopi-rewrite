# Use with a reverse proxy

When deploying behind a reverse proxy (Nginx, Caddy, Traefik, etc.):

- Forward original Host and X-Forwarded-* headers (X-Forwarded-For, X-Forwarded-Proto).
- Terminate TLS at the proxy or pass TLS through to your app depending on architecture.
- Configure websockets and HMR proxying if you need live reload in production-like setups.

Deployment tips:
- Keep proxy configuration minimal and secure.
- Let the proxy handle certificate management when possible (or integrate Let's Encrypt).

A reverse proxy is a server exposed publicly on the internet whose purpose is to connect an internal server to the public network. It receives each request intended for that internal server, forwards it to that server, then returns the server's response.

Using a reverse proxy requires distinguishing two things:
- The site's public URL: what visitors type in their browser.
- The server's technical URL: the address where the server listens to receive requests.

When a server is directly exposed to the internet these two URLs are the same. When using a reverse proxy they differ: the public URL points to the reverse proxy, which must use the server's technical URL to communicate with the internal server.

The environment variables JOPI_WEBSITE_URL and JOPI_WEBSITE_LISTENING_URL can be used to define these URLs.

* JOPI_WEBSITE_URL: sets the site's public URL, used to build links in pages and responses returned by the server.
* JOPI_WEBSITE_LISTENING_URL: sets the server's technical URL, the one the reverse proxy uses to reach our server.

> If JOPI_WEBSITE_LISTENING_URL is not defined, Jopi will automatically use JOPI_WEBSITE_URL.

**Example for /src/index.ts**
```typescript
import {jopiApp} from "jopi-rewrite";

jopiApp.startApp(import.meta, jopiEasy => {
	// Here I explicitly set the website url.
    jopiEasy.create_creatWebSiteServer("https://localhost");

    // Here I don't set it.
    // It will use process.env.JOPI_WEBSITE_LISTENING_URL.
    // With a fallback to process.env.JOPI_WEBSITE_URL.
    //
    jopiEasy.create_creatWebSiteServer();
});
```
