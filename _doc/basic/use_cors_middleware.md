# Enable CORS

To accept cross-origin requests, enable and configure the CORS middleware.

Typical options:
- allowedOrigins: `*` or an explicit list of domains
- allowedMethods: `GET, POST, PUT, DELETE, OPTIONS`
- allowedHeaders: `Content-Type, Authorization, X-Requested-With`

Example usage:
- Register the middleware globally or for specific API routes.
- For public APIs you may allow `*`; for private APIs restrict origins.

Security note:
- Be cautious with wildcard origins when requests include credentials (cookies or auth headers).

## What is CORS?

For security, when you access a server resource, the browser checks that the current site is allowed to access that server.

This matters because it reduces the possibility that a malicious website will communicate with a site where you are authenticated, without your knowledge.

* This does not prevent attacks by an attacker directly against your server.
* It reduces impersonation (cross-site request forgery / unauthorized cross-site requests).

Enabling CORS is therefore a way to protect your visitors. That's why CORS is enabled automatically.

## Modify CORS

CORS can be adjusted from the central configuration file `src/index.ts`.

```typescript
import {jopiApp} from "jopi-rewrite";

jopiApp.startApp(import.meta, jopiEasy => {
    jopiEasy.create_creatWebSiteServer()
        .configure_cors()
	        // The current website is always added automatically.
	        // Here it's a second allowed website.
            .add_allowedHost("http://mywebsiteB")

            // If you want to disable automatic CORS activation.
			.disable_cors()

            .DONE_configure_cors();
    });
```

You can also use `fastConfigure_cors` which do the same, but with a shorter syntax.

```typescript
import {jopiApp} from "jopi-rewrite";

jopiApp.startApp(import.meta, jopiEasy => {
    jopiEasy.create_creatWebSiteServer()
        // Without params: enable cors.
        .fastConfigure_cors()
        
        // With params: enable cors and allows these origins.
        .fastConfigure_cors(["http://mywebsiteA", "http://mywebsiteB"])
    });
```