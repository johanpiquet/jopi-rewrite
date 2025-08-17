# Restart without losing connection

## What is hot-reload?

The strength of the PHP language is that you can make changes without losing current connections: if a process is ongoing, it is not abruptly interrupted, and the server remains available without interruption.

With Jopi Rewrite, we can do the same! We can modify our source code and see our server use the updated version, without interrupting ongoing connections.

## Enabling hot-reload

To enable this behavior, you need to start your application with hot-reload enabled.

* Instead of running: `bun myApp.ts`
* You should run: `bun --hot myApp.ts`

With this option, the application's internal cache is automatically cleared when a change is detected in the source code, and then the entry point (myApp.ts) is executed again.

The consequence is that, for a short time, two versions of your application coexist in parallel, being completely detached from each other. The only shared area is `globalThis` (the equivalent of `window` in the browser).

## InMemoryCache

The memory cache is automatically preserved during hot-reload, which is an advantage.
The following example shows how to prevent it from being preserved.

```typescript
import {getInMemoryCache, JopiServer, WebSite, initMemoryCache} from "jopi-rewrite";

// Memory cache is automatically protected against hot-reload.
// This line allows disabling this cache protection.
// You can try to comment/uncomment this line.
//highlight-next-line
initMemoryCache({clearOnHotReload: true});

const memoryCache = getInMemoryCache();

const server = new JopiServer();
const myWebSite = server.addWebsite(new WebSite("http://127.0.0.1", {cache: memoryCache}));
server.startServer();

myWebSite.onGET("/", async req => {
    let res = await req.getFromCache(true);

    if (!res) {
        // Will allow seeing if the cache is reset when a hot-reload occurs.
        res = req.htmlResponse(new Date().toLocaleString());
        res = await req.addToCache_Compressed(res);
    }

    return res;
});
```

## Using Node Space Helpers

### What is Node Space?

`NodeSpace` comes from the library `jopi-node-space` which is referenced by Jopi Rewrite.
It exposes a global named `NodeSpace` which contains tools which are three goals:
* Make it easier to write a library for the browser with extra when on server-side.
* Bring common and useful tools.
* Detach some dependencies from Jopi Rewrite.

> To use NodeSpace, you only need to do `import "jopi-node-space"` somewhere in your code.
Not need to do it each time. It can be done by your code, or one of your dependencies.
It why this import is optional, since he is already done by Jopi Rewrite.

### onHotReload

The `onHotReload` function allows you to be notified when a hot-reload occurs.


```typescript
import "jopi-node-space"; // Optional
NodeSpace.app.onHotReload(() => { console.log("Hot reloading !") });
```

### keepIfHotReload

The `keepIfHotReload` function allows you to preserve certain data during a hot-reload.
This function will allow you to preserve the memory cache.

```typescript
import "jopi-node-space"; // Optional
import {JopiServer, WebSite} from "jopi-rewrite";

//highlight-next-line
let statCounter = NodeSpace.app.keepOnHotReload("statCount", () => ({counter: 0}));

const server = new JopiServer();
const myWebSite = server.addWebsite(new WebSite("http://127.0.0.1"));
server.startServer();

myWebSite.onGET("/", async req => {
    return req.htmlResponse("Is request #", statCounter.counter++);
});

NodeSpace.app.onHotReload(() => {console.log("Hot reloading !") });
```

### The case of timers

Hot-reload works well, however it does not stop timers (setInterval, setTimeout). That’s why you need to handle these cases manually to be compatible with hot-reload.

```typescript
const myRandom = Math.trunc(Math.random() * 1000);
const timerId = setInterval(() => { console.log("Timer ", myRandom) }, 1000);
onHotReload(() => { clearInterval(timerId) });
```

To help you, you can use the `newInterval` function, which is automatically protected.
This function is similar to setInterval, but with three differences:

- It automatically unregisters itself in case of hot-reload.
- The order of its arguments is reversed.
- If the executed function explicitly returns `false`, the timer stops.

```typescript
import "jopi-node-space"; // Optional

const myRandom = Math.trunc(Math.random() * 1000);
NodeSpace.timer.newInterval(1000, () => {console.log("Timer (newInterval)", myRandom) });
```

## Organising your code

Hot-reload is triggered instantly, as soon as you modify any part of the code (your code or a library in node_modules). Reloading happens as soon as a change is detected.

This speed can be a problem if you need to update several files. That’s why, in this case, I recommend organizing your code as follows:

```text
|- starter.ts            <-- contains only import "./version1"
|- version1/index.ts     <-- contains my real app
```

The `start.ts` file contains only an import referencing `version1/index.ts`. Here, if you modify a file contained in version1, you will trigger a hot-reload, as well as if you modify *start.ts*.

Now, here is the procedure to update your code without triggering unwanted hot-reloads:

1. Create a `version2` folder and place your new code there.
2. Modify `start.ts` so that it points to `version2`.
3. Optional: delete `version1`.

The advantage is that hot-reload will only be triggered when you modify `start.ts`.