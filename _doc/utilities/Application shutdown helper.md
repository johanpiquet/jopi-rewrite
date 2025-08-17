Jopi Rewrite allows registering listeners, which are executed when the application is shutting down.

```typescript
import {startApplication} from "jopi-rewrite";

async function myApp() {
    // doing things.
}

// Will be called when the application exit.
onApplicationExit(async () => {
    console.log("I will free my resources");
})

// If you use onApplicationExit, or something using it
// (like the "AutomaticStartStop" class), then you
// must wrap your application entry point inside "startApplication".
//
// startApplication allows automatically stopping
// things when his function stop application exit or on [Ctr]+[C].
//
startApplication(myApp);
```


    