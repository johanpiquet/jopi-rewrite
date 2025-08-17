# Create a reverse proxy

## What will you see?

Jopi Rewrite can be used to create a reverse proxy. This is an intermediary between the browser and your server, whose purpose is generally one of the following:

- **Load balancing.**  
This consists of distributing the workload between several servers.
- **Having a backup server.**  
Which will be automatically used if the main server is under maintenance.
- **Translating http to https.**  
So that Jopi Rewrite exposes https, where your native server only handles http.
- **Restricting access to certain resources.**  
By specifying allowed URLs to exclude all others.
- **Securing access to the back office.**  
By adding IP control or an additional authentication mechanism.
- **Logging requests.**  
Mainly to be able to analyze what is happening.

Jopi Rewrite also allows you to do special things that no other proxy can do:

- **Serverless operation.**  
The target server is started when needed, then shut down after a period of inactivity.
- **Stream analysis.**  
This consists of analyzing the data passing through the proxy to implement logic.  
For example, we can detect that a user has modified their cart and thus invalidate parts of the cache associated with them.
- **Soft reload.**  
One of the strengths of Jopi Rewrite is that you **can modify the code you write** without interrupting ongoing connections. You can modify your proxy's Typescript code without having to stop/restart your server.

## What Jopi Rewrite offers

Jopi Rewrite provides you with tools to easily create your own proxy, offering simple-to-use features. The provided tools are as follows:

- Tools that allow you to directly send the request to the target server while directly returning its response to the browser. Or that allow you to intercept this response before returning it.
- Tools that make it easy to observe the content of requests and responses, and modify them if necessary.
- Tools that allow you to implement load-balancing strategies to define which server should be solicited more and which should receive fewer requests.
- Tools that allow you to start a `docker` container when needed, then stop it when it is no longer useful.

## Load-balancing

### What is load-balancing

Load-balancing means not always calling the same server, in order to divide the workload between several servers.
Here we will create a proxy that does load-balancing for the site `https://developer.mozilla.org`.

The idea is as follows:
- The browser requests a page from https://developer.mozilla.org.
- Our proxy intercepts the request.
- It determines which server to send the request to, in order to distribute the load.
- Then returns the response from that server to the browser.

:::info
To intercept requests to the Mozilla site, you need to cheat and modify your local DNS.
If you are on Linux or OSX, you need to edit the /etc/hosts file to add the following entry:
127.0.0.1       developer.mozilla.org

For Windows: `C:\Windows\System32\drivers\etc\hosts`
:::

### A simple example

Here we will set up load-balancing where all target servers are called equally. The server called will be indicated in the console for each request made, which will allow you to see that our proxy is running on several servers.

```typescript
import {JopiServer, ServerFetch, WebSite} from "jopi-rewrite";

// url of Mozilla web-site.
const targetUrl = "https://developer.mozilla.org";
// ip of this server.
const targetIp = "34.111.97.67";

const server = new JopiServer();

// Create a dev certificate for HTTPS.
// Require the tool 'mkcert' to be installed.
// See: https://github.com/FiloSottile/mkcert
//
const sslCertificate = await server.createDevCertificate(new URL(targetUrl).hostname);

// Our website, with our https certificate.
const myWebSite = new WebSite(targetUrl, {certificate: sslCertificate});

// Return our target server.
// We only have one real target server.
// But for this sample we emulate 3 servers.
//
function targetServer(offset: number) {
    return ServerFetch.useOrigin(
        // We will send requests of type https://34.111.97.67
        // Why? Because now https://developer.mozilla.org is our proxy
        // and not the real Mozilla server.
        //
        "https://" + targetIp, "developer.mozilla.org", {
            // Allow knowing which server we use.
            beforeRequesting(url) { console.log("Using server", offset, "for url", url) }
        }
    );
}

// Add the servers to our loadbalancer.
myWebSite.addSourceServer(targetServer(1));
myWebSite.addSourceServer(targetServer(2));
myWebSite.addSourceServer(targetServer(3));

server.addWebsite(myWebSite);
server.startServer();

myWebSite.onGET("/**", req => {
    // directProxyToServer allows to directly send the request
    // to the server, and the response will be directly
    // sent to the browser.
    //
    return req.directProxyToServer();

    // You can also do this, where fetchServer is the function
    // we were using when creating a cache. The main difference
    // here is that fetchServer doesn't send and return all the headers.
    //
    // return req.fetchServer();
});
```

### Give priority to a server

In the previous example, all servers are called equally, with the same priority.
Here we will change this priority so that our first server is called twice as often as the others.

This is done by associating a weight to the server, which is between 0 and 1. Internally, the system creates a random number between [0...1] and compares it to the server's weight. If its weight is higher, then the server is selected. That's why a server with a weight of 1 will always be selected. While a server with a weight of 0 will never be selected.

```typescript
myWebSite.addSourceServer(targetServer(1), 1);
myWebSite.addSourceServer(targetServer(2), 0.5);
myWebSite.addSourceServer(targetServer(3), 0.5);
```

### When a server is down

Jopi Rewrite automatically handles the case where a server is no longer reachable.
When this happens, the server is marked and will no longer be used.
However, in parallel, Jopi Rewrite will regularly try to contact this server
to see if it is working again.

The following configuration allows you to have a main server, and a backup server
in case the main server becomes unreachable.

```typescript
myWebSite.addSourceServer(targetServer(1), 1);
myWebSite.addSourceServer(targetServer(2), 0);
```

Here the weights mean that the second server is never called. However, there is a subtlety,
because if no other server is available, then Jopi Rewrite selects servers
with weight 0. It will therefore use our second server.

This second example shows how to be notified when a server goes down and how to replace it.

```typescript
function buildServer(offset: number) {
    return ServerFetch.useOrigin("https://" + targetIp, "developer.mozilla.org", {
        beforeRequesting(url) { console.log("Using server", offset, "for url", url) }
    });
}

function buildKoServer(offset: number) {
    return ServerFetch.useOrigin("http://donexist_111ddndkdhd", undefined, {
        beforeRequesting(url) {
            console.log("Using ko server", offset, "for url", url)
        },

        ifServerIsDown() {
            console.log("Server is ko:", "donexist_111ddndkdhd");

            // Return nothing, or the replacement server.
            return Promise.resolve({
                newServer: buildServer(offset),
                newServerWeight: 1 // Optional
            });
        }
    });
}
myWebSite.addSourceServer(buildKoServer(1));

server.addWebsite(myWebSite);
server.startServer();
```

## X-Forward

Here the `req.directProxyToServer` function does not modify the headers of the request we send to the servers.
If you want to add headers, especially `X-Forward` headers, you must add them manually.

```typescript title="Example of adding a request header"
myWebSite.addSourceServer(ServerFetch.useAsIs({
    // Is called before each request.
    beforeRequesting: (url: string, fetchOptions: FetchOptions) => {
        console.log("Will call url:", url);
        fetchOptions.headers?.set("X-Forwarded-Host", "www.mywebsite.com")
    }
}));
```

:::info
The philosophy of Jopi Rewrite is to avoid doing things automatically
to avoid side effects that we could not guess by reading the source code. In return, the framework tries to offer facilities to
easily set up the desired behaviors.
:::