# The 4 initialization files

Jopi projects commonly rely on four initialization files to bootstrap the application:

1. package.json
   - Project metadata, dependencies and scripts (dev, build, start).
   - Define scripts for development with Bun/Node and production start.
2. tsconfig.json (optional)
   - TypeScript configuration when using TypeScript.
   - Set compiler options, path aliases and module resolution as needed.
3. jopi.config.js (or jopi.config.ts)
   - Framework configuration: module order/priorities, aliases, cache and auth settings.
   - Register global middlewares, menus and module-specific options.
4. src/
   - The source folder containing modules (mod_*) and their special directories such as @routes and @alias.

Keep these files minimal at first and extend them as your application grows. The framework expects the src layout to determine routing and module registration.

The file `index.ts` (A) is the program entry point. This is where the server is created.

Example configuration file:
```typescript
import {jopiApp} from "jopi-rewrite";
import myUsers from "./myUsers.json" with { type: "json" };

jopiApp.startApp(import.meta, jopiEasy => {
    jopiEasy.create_creatWebSiteServer()

        .configure_cache()
	        // ...
            .END_configure_cache()

        .enable_cors()
		    // ...
            .DONE_enableCors()

        .enable_jwtTokenAuth()
            // ...
            .DONE_enable_jwtTokenAuth()
    });
```

Each module has a `serverInit.ts` file that is automatically called after evaluating the `index.ts` file. It exports a default function that receives the value returned by `jopiEasy.create_creatWebSiteServer()`.

Example `serverInit.ts` file:
```typescript
import {JopiEasyWebSite} from "jopi-rewrite";

export default async function(webSite: JopiEasyWebSite) {
    // webSite is the result of "jopiEasy.create_creatWebSiteServer()".
    webSite.configure_cache()
		// ...
		.END_configure_cache()
}
```

Each module can also have a `uiInit.ts` (or `uiInit.tsx`). It is called every time the server renders a React page (corresponding to an `index.page.ts` file). It is also executed in the browser on each load. As a result, it runs multiple times on the server and once in the browser.

Example `uiInit.tsx` file:
```typescript
import {UiKitModule, MenuName} from "jopi-rewrite/uikit";
import {isBrowser} from "jopi-toolkit/jk_what";

// Note: the default class received is "ModuleInitContext"
// but ui-kit overrides the creation step to provide an
// instance of UiKitModule.
//
export default function(myModule: UiKitModule) {
}
```
