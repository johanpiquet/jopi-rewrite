# Les trois fichiers d'initialisation

Jopi offre quatre façon d'initialiser un projet.

```
|- package.json
|- src/
   |- index.ts            < (A) First init file
   |- mod_moduleA
   |- mod_moduleB
      |- serverInit.ts    < (B) Per module init file
      |- uiInit.tsx       < (C) Browser & React SSR init file
      |- @routes/
         |- products/
            |- page.tsx
            |- config.ts  < (D) Allow configuring the route.
```

Le fichier `index.ts` (A) est le point d'entée du programme. C'est là où le serveur est créé.

**Exemple de fichier de configuration**
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

Chaque module a un fichier `serverInit.ts` qui est automatiquement appelé après avoir évalué le fichier `index.ts`. Il exporte une fonction par défaut, qui reçoit la valeur renvoyée par `jopiEasy.create_creatWebSiteServer()`.

**Exemple de fichier serverInit.ts**
```typescript
import {JopiEasyWebSite} from "jopi-rewrite";  
    
export default async function(webSite: JopiEasyWebSite) {  
    // webSite is the result of "jopiEasy.create_creatWebSiteServer()".
    webSite.configure_cache()  
		// ...
		.END_configure_cache()  
}
```

Chaque peut aussi avoir un fichier `uiInit.ts`. Il est appelé à chaque fois que le serveur fait le rendu d'une page React (correspondant à un fichier `index.page.ts`). Il est aussi exécuté dans le navigateur à chaque chargement. Il est donc exécuté plusieurs fois côté serveur, et une seule fois côté navigateur.

**Exemple de fichier uiInit.tsx**
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