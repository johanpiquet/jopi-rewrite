# Enabling CORS

## What is CORS?

CORS security prevents HTTP requests coming from a browser when they are not made from your website's web page.

CORS is important because it helps limit CSRF (Cross-Site Request Forgery) attacks. The idea behind these attacks is that a malicious site you visit can send requests to a website where you are authenticated, in order to steal your session cookies and perform actions on your behalf.

With the browser's cooperation, CORS security will block all requests to your website that do not originate from one of your pages.

> Even today, in 2025, many independent e-commerce sites do not enable CORS security and are vulnerable to this type of attack.

## How to enable CORS protection?

CORS exists as middleware. To enable it, you have to enable it like this:

```typescript
import {jopiApp} from "jopi-rewrite";

jopiApp.startApp(import.meta, jopiEasy => {
    jopiEasy.new_webSite("http://127.0.0.1")
        .add_middleware()
            .use_cors()
            .END_add_middleware()
        .add_path("/search")
            .onGET(async req => req.htmlResponse(req.urlInfos.href))
});
```

## A deliberately limited implementation
The CORS implementation in Jopi Rewrite only emits the CORS header *Access-Control-Allow-Origin*, which is interpreted and enforced by the browser. This implementation does nothing more than emit these headers, and this is intentional.

Why? Because apart from the scenario described here, CORS technology is not really effective at protecting your resources. Outside of a browser, it is very easy to create forged requests using a tool and bypass CORS controls. Even a complete beginner can easily do this.