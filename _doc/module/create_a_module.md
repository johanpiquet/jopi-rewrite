# Create a module

Modules organize related functionality and can be reused or shared.

Steps to create a module:
1. Create a folder named `mod_<name>` under src/.
2. Add special folders like `@routes` and `@alias` as needed.
3. Export module metadata if the framework requires registration (priority, name, etc.).
4. Implement routes, shared components and configuration inside the module.

Best practices:
- Keep modules focused and cohesive.
- Use @alias to expose components to other modules.

## What are modules?

Modules let you split your application into functional units. Think of it as a core application with plugins that extend it.

For example, one module defines the site structure (layout with a top menu, a user menu on the right, a central area and a footer), another module adds a product catalog (e-commerce) and a third module adds a contact page.

These are three decoupled parts, which helps because:
* You know where to look for things in a well-defined area.
* When working in a team, each person can work on a part without stepping on others' work.

Although separated into logical units, modules are not fully isolated:
* An event system allows modules to communicate by sending messages and responding to them.
* A mechanism allows modules to expose public items so other modules can use them (for example React components and data schemas).
* Another mechanism lets modules add to lists that other modules consume. For example, a list of icons to show next to a product's "Add to cart" button.

## How to create a module?

A module is a folder at the root of the `src/` directory whose name starts with `mod_`. Creating such a folder creates a module.

**Project example**
```
|- src/
	|- mod_moduleA    < First module
	|- mod_moduleB    < Second module
```

## Inside a module

A module folder contains special items whose names might be surprising.

**Module content**
```
|- mod_moduleA/
	|- @alias/                  < For sharing items across modules, allowing:
	   |- uiBlocks/                   import "@/uiBlocks/myBlock"
	   |- uiComposites/               import "@/uiComposites/myComp"
	   |- events/                     import "@/events/myEvent"
	|- @routes/                 < Define the routes
	|- uiInit.tsx               < Called on page render
	|- serverInit.ts            < Called on server start
```
## The serverInit.ts file

This file is called by the server at startup. Each module has such a file.

**Example serverInit.ts**
```typescript
import type {JopiEasyWebSite} from "jopi-rewrite";
import {JopiRequest} from "jopi-rewrite";

async function printIp(req: JopiRequest) {
    console.log("Caller IP is", ip);
    return null;
}

export default async function(webSite: JopiEasyWebSite) {
    // ...
}
```

## The uiInit.ts file

This file is called on every page render. It's invoked on the server when rendering the page and by the browser during page hydration.

**Example uiInit.tsx**
```typescript tsx
import {UiKitModule, MenuName} from "jopi-rewrite/uikit";

// myModule is of type ModuleInitContext,
// and is upgraded to UiKitModule if you use
// UiKit features (which is almost always the case).
//
export default function(myModule: UiKitModule) {
	console.log("I'm called immediately.");

    myModule.addUiInitializer(() => {
        console.log('I am called when all modules are loaded');
    });
}
```
