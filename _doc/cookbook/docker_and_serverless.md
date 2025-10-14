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
import {jopiApp} from "jopi-rewrite";
import * as ns_timer from "jopi-node-space/ns_timer";

jopiApp.startApp(import.meta, jopiEasy => {
    jopiEasy.new_webSite("http://127.0.0.1")
        .add_sourceServer()
        .useOrigin("http://my-source-server-a.local")

        // Is called to start the remote server.
        .do_startServer(async () => {
            console.log("Starting server A");

            // Start the docker.
            await Bun.$`cd wordpressDocker; docker compose up -d`;

            // Allows stopping the server after 10 minutes
            // if not request are emitted for this server.
            return ns_timer.ONE_MINUTE * 10;
        })

        // Allow stopping the remote server.
        .do_stopServer(async () => {
            console.log("Stopping server A");

            // Stop the docker.
            await Bun.$`cd wordpressDocker; docker compose down`;
        })

        .END_add_sourceServer()

        // directProxyToServer allows sending the request to the server.
        .add_path_GET("/**", req => req.directProxyToServer())
});
```