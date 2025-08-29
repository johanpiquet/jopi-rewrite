## Create the package.jsonc file

Once node.js, or bun.js, is installed, we can create our project.

The first step is to create a `package.json`. Here I created a commented version, and you will have to remove this comment or use the `.jsonc`file extension.

**File: package.json**
```json
{
    "dependencies": {
        // Our only one dependency.
        "jopi-rewrite": "latest"
    },
    "devDependencies": {
        // Allow typescript auto completion for bun.js.
        // It includes "@types/nodes" so we only need this one.
        "@types/bun": "latest"
    },

    "scripts": {
        // We need to use jopib et jopin
        // which add capacities to the javascritp engine.
        //
        "start-bun": "jopib ./index.ts",
        "start-node": "jopib ./index.js",
      
        // For node.js, transforming ".ts" to ".js".
        "tsc": "npx tsc"
    },
  
    // Because we are using "import" and not "require".
    "type": "module"
}
```

## Create the tsconfig.json file

We will now create a `./tsconfig.json` file to enable the TypeScript engine. This step is optional but important if you work with WebStorm or Visual Studio Code to get code auto-completion and code analysis.

**File: tsconfig.json**
```json
{
  "compilerOptions": {
    // We don't want to transform TypeScript to JavaScript
    // but only check the TypeScript.
    // (must be false for node.js)
    //
    "noEmit": true,

    // Allow the fetch function and other browser side stuff.
    // It's important because we uses some browser APIs.
    //
    "lib": ["ES2022", "DOM", "DOM.Iterable"],

    // For React component support.
    "jsx": "react",

    "target": "ESNext",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",

    // Allow things like "import "./myFile.ts"
    // where the .ts is translated to .js
    //
    "rewriteRelativeImportExtensions": true,

    // Avoid errors between windows/linux.
    "forceConsistentCasingInFileNames": true,
    
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "verbatimModuleSyntax": true
  },
  
  // Avoid analyzing our modules
  // which make it a lot faster.
  "exclude": [ "node_modules" ]
}
```

## Create the index.ts file

We will now create the `index.ts` file containing the code for our application. Here is a minimal example to get started with Jopi Rewrite.

**File: index.ts**
```typescript
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