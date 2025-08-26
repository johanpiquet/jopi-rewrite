## Create the package.jsonc file

Once Node.js, or Bun.js, is installed, we can create our project.
Here we will use a *jsonc* which allows me to add comments.

```json title="Our package.jsonc file"
{
    "dependencies": {
        // For the server part of our project.
        "jopi-rewrite": "latest",
        // For the UI part of our project.
        "jopi-rewrite-ui": "latest"
    },
    "devDependencies": {
        // It allows importing CSS/image in server side.
        // Lile with Vites.js / WebPack, but for server code.
        // (it's a must have for React Server Side project)
        //
        "jopi-loader": "latest",
      
        // Allow support for bun.js.
        // It's include "@types/nodes" so we only need this one.
        "@types/bun": "latest"
    },

    "scripts": {
        "start-bun": "bun --preload jopi-loader ./index.ts",
        "start-node": "node --import jopi-loader ./index.js",

        // It's shortcuts avoiding the preload/import.
        "start-bun-with-loader": "jopib ./index.ts",
        "start-node-with-loader": "jopin ./index.js",
      
        // For node.js, transforming ".ts" to ".js".
        "tsc": "npx tsc"
    },
    
    // Optional, required if you create a library.
    // (must be index.js for node.js)
    "main": "index.ts",
  
    // Because we are using "import" and not "require".
    "type": "module"
}
```

> `jopib` and `jopin` are available when `jopi-loader` is installed globally.  
> **npm install jopi-loader --global**
> or **bun install jopi-loader --global**

## Create the tsconfig.json file

We will now create a `./tsconfig.json` file to enable the TypeScript engine. This step is optional but important
if you work with WebStorm or Visual Studio Code to get code auto-completion and code analysis to receive warnings
in case of errors or bad practices.

```json title="Our tsconfig.json file"
{
  "compilerOptions": {
    // We don't want to transform TypeScript to JavaScript
    // but only check the TypeScript.
    //
    // (must be false for node.js)
    //
    "noEmit": true,

    // Allow the fetch function and other browser side stuff.
    // It's important because Bun.js uses some browser APIs.
    //
    "lib": ["ES2022", "DOM", "DOM.Iterable"],

    // For React component support.
    "jsx": "react",

    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "Bundler",

    // Allow things like "import "./myFile.ts"
    // where the .ts is translated to .js
    //
    "rewriteRelativeImportExtensions": true,

    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true,
    "verbatimModuleSyntax": true
  },
  
  // Makes it much faster!
  "exclude": [ "node_modules" ]
}
```

## Create the index.ts file

We will now create the `index.ts` file containing the code for our application.  
Here is a minimal example to get started with Jopi Rewrite.

```typescript title="Our ./src/index.ts"
import {jopiApp} from "jopi-rewrite";

// Start the app.
//
// Doing this allow registering handlers
// for when the app exists, for cleanup.
//
jopiApp.startApp(jopiEasy => {
    // Create a website.
    jopiEasy.new_webSite("http://127.0.0.1:3000")
        // Add a listener for http://127.0.0.1:3000/welcome
        .add_path("/welcome")
        // ... which response to GET.
        .onGET(async req => req.htmlResponse("hello world"))
        .DONE_add_path();
});
```

> Jopi Rewrite has a special API which guides you.
> This API is designed to only show you what is relevant in your current use case. 