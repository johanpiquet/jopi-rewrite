# Create a reverse proxy

## What will you see?

Jopi Rewrite can be used to create a reverse proxy. This is an intermediary between the browser and your server, whose purpose is generally one of the following:

- **Load balancing.**  
This consists of distributing the workload between several servers.
- **Having a backup server.**  
Which will be automatically used if the main server is under maintenance.
- **Translating http to https.**  
So that Jopi Rewrite exposes https, where your native server only handles http.
- **Restricting access to some resources.**  
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
- Tools that allow you to start a `docker` container when needed, then stop it when it is no longer used.

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
import {jopiApp} from "jopi-rewrite";

jopiApp.startApp(jopiEasy => {
    jopiEasy.new_webSite("http://127.0.0.1")
        .add_sourceServer().useOrigin("http://my-source-server-a.local").set_weight(1)
        .add_sourceServer().useOrigin("http://my-source-server-b.local").set_weight(1)
        .add_sourceServer().useOrigin("http://my-source-server-c.local").set_weight(1)
        .END_add_sourceServer()

        .add_path_GET("/**", req => {
            // directProxyToServer allows directly sending the request
            // to our source server, and the response will be directly
            // sent to the browser.
            //
            return req.directProxyToServer();
        })
});
```

### Give priority to a server

In the previous example, all servers are called equally, with the same priority.
Here we will change this priority so that our first server is called twice as often as the others.

This is done by associating a weight with the server, which is between 0 and 1. A weight of 1 means
that this server is a server called in priority. And a weight of 0 means it's only called of no
other server are available (for example, if they are down). Intermediate values are bound to a
random selection algorithm where high values are more frequently selected.

```typescript
 jopiEasy.new_webSite("http://127.0.0.1")
    // Main server.
    .add_sourceServer().useOrigin("http://my-source-server-a.local").set_weight(1)
    // Is called less times than the main server
    .add_sourceServer().useOrigin("http://my-source-server-b.local").set_weight(0.5)
    // Is caleld if others servers are down.
    .add_sourceServer().useOrigin("http://my-backup-server.local").set_weight(0)
    .END_add_sourceServer();
```

### When a server is down

Jopi Rewrite automatically handles the case where a server is no longer reachable.
When this happens, the server is marked and will no longer be used.
However, in parallel, Jopi Rewrite will regularly try to contact this server
to see if it is working again.

This example shows how to be notified when a server goes down and how to replace it.

```typescript
import {jopiApp} from "jopi-rewrite";

jopiApp.startApp(jopiEasy => {
    jopiEasy.new_webSite("http://127.0.0.1")
        .add_sourceServer()
        .useOrigin("http://my-source-server-a.local")
        .on_beforeRequesting(url => { console.log("Sending a request to " + url) })
        .on_ifServerIsDown(serverReplace => {
            console.log("Server is ko: http://my-source-server-a.local");
            serverReplace.useOrigin("http://my-source-server-a.local").set_weight(1)
        })
        .END_add_sourceServer()
});
```

## X-Forward

Here the `req.directProxyToServer` function does not modify the headers of the request we send to the servers.
If you want to add headers, especially `X-Forward` headers, you must add them manually.

:::info
The philosophy of Jopi Rewrite is to avoid doing things automatically
to avoid side effects that we could not guess by reading the source code. In return, the framework tries to offer facilities to
easily set up the desired behaviors.
:::