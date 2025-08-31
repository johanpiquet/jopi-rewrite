# Application shutdown helper

Jopi Rewrite allows registering listeners, which are executed when the application is shutting down.
It's useful if you have resource to clean.

> When using jopin/jopib in development mode, then the application is stopped abruptly
> if you kill the application through your IDE, or when doing [CTRL]+[C]. However in production mode
> it does a smooth shutdown.
 
```typescript
import {getServer, jopiApp} from "jopi-rewrite";

NodeSpace.app.onAppExiting(async () => {
    console.log("App exiting...");
    await NodeSpace.timer.tick(2000);
    console.log("App Exited!");
});

jopiApp.startApp(jopiEasy => {
    jopiEasy.new_webSite("http://127.0.0.1")
        .add_path_GET("/", async req => {
            await getServer().stopServer();
            return req.htmlResponse("Server stopping");
        })
});
```


    