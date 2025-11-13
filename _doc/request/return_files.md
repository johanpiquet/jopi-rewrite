# Return files

To serve files for download or inline viewing:

1. Read the file from disk or cloud storage as a stream or buffer.
2. Set appropriate headers:
   - Content-Type: MIME type (e.g., application/pdf, image/png)
   - Content-Disposition: `attachment; filename="name.ext"` for downloads or `inline` for display
3. Return the Response with the file body and headers.

Example:
```js
return new Response(fileStream, { headers: { 'Content-Type': mimeType } });
```

Security:
- Protect private files behind authentication and permission checks.
- Validate requested paths to prevent directory traversal.

## The function "req.returnFile"

The function `req.returnFile` allows returning a file. This function is optimized for speed; however, it does not support `range` headers that enable pausing/resuming large downloads or seeking within a video file.

```typescript
import {JopiRequest} from "jopi-rewrite";

export default async function(req: JopiRequest) {
    const myFilePath = "./logo.png";
    return req.returnFile(myFilePath)
}
```

## The function "req.serveFromDir"

The function `req.serveFromDir` allows exposing a directory. It should be used with catch-all routes to capture all calls from a given entry point.

**Where to bind the route**
```
|- @routes
   |- public/
      |- [...]/        < catch-all after http://mysite/public/
         |- onGET.ts
```

**File onGET.ts**
```typescript
import {JopiRequest} from "jopi-rewrite";

export default async function(req: JopiRequest) {
    const publicDirPath = "./www";
    return req.serveFromDir(publicDirPath)
}
```

## Create a file server

In your application's initialization file `index.ts`, the first lines look like this:

**File src/index.ts**
```typescript
import {jopiApp} from "jopi-rewrite";
import myUsers from "./myUsers.json" with { type: "json" };

jopiApp.startApp(import.meta, jopiEasy => {
    jopiEasy.create_creatWebSiteServer();
    //...
});
```

Here we create a simple website as a starting point. Jopi also offers other options to create specialized servers, including the `create_fileServer` function.

**File src/index.ts**
```typescript
import {jopiApp} from "jopi-rewrite";
import myUsers from "./myUsers.json" with { type: "json" };

jopiApp.startApp(import.meta, jopiEasy => {
	jopiEasy.create_fileServer()
	    // The directory with our public files
	    .set_rootDir("./public")
	    .DONE_create_fileServer()

	    // --> After DONE_new_fileServer the methods
	    // exposed are the same as what you get with
	    // create_creatWebSiteServer
});
```

In this example we created a file server exposing the `public` folder. Although it is a file server, the routing system still applies, so this server also acts as an application server.
