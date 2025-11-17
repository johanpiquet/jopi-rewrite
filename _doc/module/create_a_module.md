# Créer un module

## Que sont les modules ?

Les modules permettent de découper votre applications en unités fonctionnelles. Vous pouvez voir cela comme une application ayant une base et des plugins enrichissant celle-ci.

Par exemple, un module définit la structure du site (le layout avec un menu en haut, un menu utilisateur à droite, une zone centrale et un footer) tandis qu'un module ajoute un catalogue de produits (e-commerce) et un autre module ajoute une page de contact.

Ici ce sont trois parties découplées, avec pour intérêt que :
* Vous savez où chercher quoi, dans une zone bien délimitée.
* Si vous travaillez en équipe, chaque travaillant sur une partie sans se télescoper.

Bien que séparés en unités logiques, les modules ne sont pas entièrement cloisonnés :
* Un système d'évènements permet de communiquer entre les modules par envoie de message et réponse à ces messages.
* Un système permet de rendre des éléments publiques, ce qui signifie que les autres modules peuvent les utiliser. Par exemple des composants React.js et des schémas de données.
* Un troisième mécanisme permet de créer des listes que chaque module peut enrichir. Par exemple pour une liste d'icônes à afficher sous le bouton "Ajout au panier" d'un produit.

## Comment créer un module ?

Un module est un dossier à la racine du dossier `src/` contenant vos sources, et dont le nom commence par `mod_`. Il vous suffit de créer un tel dossier pour créer un module.

**Exemple de projet**
```
|- src/
	|- mod_moduleA    < First module 
	|- mod_moduleB    < Second module
```

## L'intérieur d'un module

Un dossier de module contient des éléments particuliers dont les noms peuvent vous surprendre.

**Contenu d'un module**
```
|- mod_moduleA/
	|- @alias/                  < For sharing items though modules, allowing: 
	   |- uiBlocks/                   import "@/uiBlocks/myBlock"
	   |- uiComposites/               import "@/uiComposites/myComp"
	   |- events/                     import "@/events/myEvent"
	|- @routes/                 < Define the routes
	|- uiInit.tsx               < Called on page render
	|- serverInit.ts            < Called on server start
```
## Le fichier "serverInit.ts"

Ce fichier est appel par le serveur au démarrage.  Chaque module possède un tel fichier.

**Exemple de fichier serverInit.ts**
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

## Le fichier "uiInit.ts"

Ce fichier est appelé à chaque rendu d'une page. Il est appelé côté serveur lorsqu'il crée le visuel de la page et il est appelé par le navigateur au moment du chargement de la page.

**Exemple de fichier uiInit.tsx**
```typescript tsx
import {UiKitModule, MenuName} from "jopi-rewrite/uikit";  
  
// myModule is of type ModuleInitContext.
// But is upgradedto UiKitModule if you use
// uiKit features, which is near always the case.
//
export default function(myModule: UiKitModule) {  
	console.log("I'm called immediatly.");

    myModule.addUiInitializer(() => {  
        console.log('I'm called when all module are loaded');  
    });
}
```