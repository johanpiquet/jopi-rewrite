# Manage trailing slash

Le comportement par défault de Jopi, est de retirer les slashs en fin d'url. 
Ainsi l'url `http://monsite.com/` devient `http://monsite.com`, ce qui engendre :
* La génération d'url sans le slash.
* Une redirection automatique dans le navigateur, vers l'url sans le slash. 

Ce comportement peut-être configuré afin de forcer l'ajouter des trailing-slash.

```typescript
import {jopiApp} from "jopi-rewrite";

jopiApp.startApp(import.meta, jopiEasy => {
    jopiEasy.create_creatWebSiteServer()
        .configure_behaviors()
            // Now we will have / at the end of each url.
            .removeTrailingSlashs(false)
            .END_configure_behaviors()
    });
```