# Restart without losing connection

## What is hot-reload?

The strength of the PHP language is that you can make changes without losing current connections: if a process is ongoing, it is not abruptly interrupted, and the server remains available without interruption.

With Jopi Rewrite, we can do the same! We can modify our source code and see our server use the updated version without interrupting ongoing connections.

> Current connections aren't lost when doing a hot-reload.
> The request will be fully processed with the old version.
 
## Enabling hot-reload

Hot-reloading is only available with `bun.js`. To enable this behavior, you only need to use the launcher `jopib`.

* Instead of doing: `bun myApp.ts`
* You must do : `bun --hot myApp.ts`
* Or: `jopib --hot myApp.ts`

> If hot reload is enabled, then `jopib` internal file watching is disabled.  

## Hot reload API

Jopi Rewrite includes a full set of helpers for hot-reload. They allow :
* To keep some data in memory without losing it when restarting.
* Add functions which must be called when a restart has occurred. 

> To know: the memory cache data are not reset when a hot-reload occurs 

### NodeSpace

Jopi NodeSpace is a set of common tools for browser and server.
It declares a global variable named NodeSpace. To use it, you
have nothing to import.

### onHotReload

The `onHotReload` function allows you to be notified when a hot-reload has occurred.

```typescript
import * as ns_app from "jopi-toolkit/ns_app";
ns_app.onHotReload(() => { console.log("Hot reloading !") });
```

### keepIfHotReload

The `keepIfHotReload` function allows you to preserve some data during a hot-reload.

```typescript
import * as ns_app from "jopi-toolkit/ns_app";

let statCounter = ns_app.keepOnHotReload(
    // The name of the memorized value;
    "statCount",
    
    // A function which is called the first time and put in cache.
    () => ({counter: 0})
);
```

### The case of timers

Hot-reload works well, but it does not stop timers (setInterval, setTimeout). That’s why you need to handle these cases manually to be compatible with hot-reload.

```typescript
const myRandom = Math.trunc(Math.random() * 1000);
const timerId = setInterval(() => { console.log("Timer ", myRandom) }, 1000);
onHotReload(() => { clearInterval(timerId) });
```

To help you, you can use the `newInterval` function, which is automatically protected.
This function is similar to setInterval, but with three differences:

- It automatically unregisters itself in case of hot-reload.
- If the executed function explicitly returns `false`, the timer stops.

```typescript
import * as ns_timer from "jopi-toolkit/ns_timer";
const myRandom = Math.trunc(Math.random() * 1000);

ns_timer.newInterval(1000, () => {
    console.log("Timer (newInterval)", myRandom);
    // returning false stop the timer.
    //return false;
});
```

## Organizing your code

Hot-reload is triggered instantly, as soon as you modify any part of the code (your code or a library in node_modules). Reloading happens as soon as a change is detected.

This speed can be a problem if you need to update several files. That’s why, in this case, we recommend you to organize your code as follows:

```text
|- starter.ts            <-- contains only: import "./version1/index.ts"
|- version1/index.ts     <-- contains my real app
```

The `start.ts` file contains only an import referencing `version1/index.ts`. Here, if you modify a file contained in version1, you will trigger a hot-reload, as well as if you modify *start.ts*.

Now, here is the procedure to update your code without triggering unwanted hot-reloads:

1. Create a `version2` folder and place your new code there.
2. Modify `start.ts` so that it points to `version2`.
3. Optional: delete `version1`.

Here the hot-reload will only be triggered when you modify `start.ts`.