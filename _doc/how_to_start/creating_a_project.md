## Create the package.jsonc file

Once Bun.js is installed, we can create our project. Here, everything works just like with Node.js, so we will start by creating a `./package.json` file. However, here it will be a *jsonc*: which is JSON with the possibility to insert comments.

```json title="Our package.jsonc file"
{
    "dependencies": {
        // For the server part of our project.
        "jopi-rewrite": "latest",
        // For the UI part of our project.
        "jopi-rewrite-ui": "latest"
    },
    "devDependencies": {
        // Allow support for bun.js
        "@types/bun": "latest"
    },

    "scripts": {
        "start": "bun ./src/index.ts",

        // Allow restarting when changes are detected in our source code.
        "watch": "bun --watch ./src/index.ts"
    },

    // Optional, allows you to specify that it's a bun project.
    "engines": {
        "bun": "^1.2.18"
    },

    // Optional, required if you create a library.
    "main": "index.ts"
}
```

## Create the tsconfig.json file

We will now create a `./tsconfig.json` file to enable the TypeScript engine. This step is optional, but important if you work with WebStorm or Visual Studio Code to get code auto-completion and code analysis to receive warnings in case of errors or bad practices.

```json title="Our tsconfig.json file"
{
  "compilerOptions": {
    // We don't want to transform TypeScript to JavaScript
    // but only check the TypeScript.
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

    // Allow things like "import "./myFile"
    // where we don't put the .ts at the end of the file name.
    // Bun doesn't require it, but the TypeScript checker needs this option.
    //
    "rewriteRelativeImportExtensions": true,

    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true,
    "verbatimModuleSyntax": true
  },

  "include": [
    "src/**/*.ts",
    "src/**/*.tsx"
  ],
  
  // Makes it much faster!
  "exclude": [ "node_modules" ]
}
```

## Create the src/index.ts file

We will now create the `/src/index.ts` file containing the code for our application.
Here is a minimal example to get started with Jopi Rewrite.

```typescript title="Our ./src/index.ts"
import {JopiServer, WebSite} from "jopi-rewrite";

// Start our server.
const server = new JopiServer();
const myWebSite = server.addWebsite(new WebSite("http://127.0.0.1"));
server.startServer();

// Bind a handler.
myWebSite.onGET("/", req => req.htmlResponse("Hello !"));
```

## Run our application

All that's left is to start our server.

```bash tile="Starting the app"
bun run start
```

If you visit the URL http://127.0.0.1 you will see the message displayed.