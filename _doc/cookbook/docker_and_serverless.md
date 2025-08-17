# Docker and serverless

## What is serverless?

The term `serverless` means that your server runs on demand and then stops when it is no longer necessary.

1. It starts when a request concerns it.
2. It stays on as long as we receive requests for it.
3. Then it is automatically shut down after a few minutes if there are no more requests.

Jopi Rewrite provides a class called `AutomaticStartStop` that manages these start and stop steps.
That's what we will see here.

## Starting/stopping a Docker server

In the following example, we will automatically start a Docker server, which is assumed to expose a WordPress instance.
It will start at the time of the first request, then automatically shut down after two minutes of inactivity.

```typescript
import {JopiServer, ServerFetch, AutomaticStartStop, WebSite} from "jopi-rewrite";

/**
 * Will allow starting a PHP server exposed inside a docker
 * and automatically stop it when it's not needed anymore.
 */
const startStop = new AutomaticStartStop({
    name: "my little server",

    // Will check if 'docker' exists on the system.
    // This by doing a "which docker" (or "where" if on Windows).
    //
    requireTool: "docker",

    // Will automatically stop the docker
    // if no requests are emitted after about 2 minutes.
    //
    autoShutdownAfter_ms: 1000 * 60 * 2,

    // Is called to start our docker.
    onStart: async () => {
        console.log("I'm starting!");
        await Bun.$`cd wordpressDocker; docker compose up -d`;
        console.log("I'm started!");
    },

    // Is automatically called to stop our docker.
    onStop: async () => {
        console.log("I'm stopping!");
        await Bun.$`cd wordpressDocker; docker compose down`;
        console.log("I'm stopped!");
    }
});

const server = new JopiServer();

// Create a local dev certificate.
const certificate = await server.createDevCertificate("127.0.0.1");

// Our server is https.
const myWebSite = new WebSite("https://127.0.0.1", {certificate});

// My docker is responding on http://127.0.0.1:8080.
// Request will be translated to use this url origin.
myWebSite.addSourceServer(ServerFetch.useOrigin("http://127.0.0.1:8080", undefined, {
    // Is called before each request.
    beforeRequesting: () => {
        // Calling start will start our docker.
        // If already started, then it will allow
        // the system to know that the tool continues to be needed.
        // Otherwise, the automatic shutdown will be executed after 2 minutes.
        //
        return startStop.start();
    }
}));

server.addWebsite(myWebSite);
server.startServer();
myWebSite.onGET("/**", req => req.directProxyToServer());
```