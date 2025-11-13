# Enable HTTPS

Jopi supports HTTPS for local development and production.

Local development:
- The framework can generate self-signed certificates for your machine.
- Use the HTTPS dev option in the config or run the dev server with TLS enabled.

Production:
- Integrate Let's Encrypt to obtain trusted certificates automatically.
- Configure automatic renewal and ensure your server or proxy reloads certificates without downtime.

Security tips:
- Use strong cipher suites and keep your TLS dependencies up to date.
- For production, avoid self-signed certificates and rely on a trusted CA.

## Define the site URL

With Jopi, you have two ways to define the website URL. Either explicitly set the URL, or use the environment variable JOPI_WEBSITE_LISTENING_URL (or JOPI_WEBSITE_URL).

```typescript
import {jopiApp} from "jopi-rewrite";

jopiApp.startApp(import.meta, jopiEasy => {
	// Here I explicitely set the website url.
    jopiEasy.create_creatWebSiteServer("https://localhost");

    // Here I don't set it.
    // It will use process.env.JOPI_WEBSITE_LISTENING_URL.
    // With a fallback to process.env.JOPI_WEBSITE_URL.
    //
    jopiEasy.create_creatWebSiteServer();
});
```

## Using an SSL certificate

Jopi offers three ways to provide an SSL certificate:
* Implicitly, by placing your certificate in the "./certs" folder (next to package.json).
* By requesting Jopi to generate a development certificate (usable only locally).
* By requesting Jopi to use LetsEncrypt.

### Use the certs folder

Assuming your site has the URL `https://mysite.com:3000`, here's where to place the certificate.

```
|- package.json
|- certs/
   |- mysite.com/
	 |- certificate.key
	 |- certificate.crt.key
```

## Use a development certificate

```typescript
import {jopiApp} from "jopi-rewrite";

jopiApp.startApp(import.meta, jopiEasy => {
	jopiEasy.create_creatWebSiteServer()
	  .add_httpCertificate()
	    .generate_localDevCert()
	    .DONE_add_httpCertificate()
});
```

### Use LetsEncrypt

```typescript
import {jopiApp} from "jopi-rewrite";

jopiApp.startApp(import.meta, jopiEasy => {
    jopiEasy.create_creatWebSiteServer(`https://mysite.com:3000`)
        .add_httpCertificate()
            .generate_letsEncryptCert("myemail@me.com")
            .force_expireAfter_days(30) // Optional
            .enable_production(true) // Optional
            .disable_log() // Optional
            .DONE_add_httpCertificate();
});
```
