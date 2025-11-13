# Renvoyer des fichiers

Vous avez trois possibilités pour renvoyer des fichiers:
* Utiliser `req.returnFile` afin de renvoyer le contenu d'un fichier précis.
* Utiliser `req.serverFromDir` afin de servir un répertoire.
* Créer un serveur de fichier, où url / pages / API sont mélangés

## La fonction "req.returnFile"

La fonction `req.returnFile` permet de renvoyer un fichier. Cette fonction est optimisée pour la rapidité, cependant elle ne supporte pas les header `range` permettant la mise en pause / reprise d'un téléchargement volumineux, ou le déplacement dans un fichier vidéo.

```typescript
import {JopiRequest} from "jopi-rewrite";  
  
export default async function(req: JopiRequest) {  
    const myFilePath = "./logo.png";  
    return req.returnFile(myFilePath)  
}
```

## La fonction "req.serverFromDir"

La fonction `req.serverFromDir` permet d'exposer un dossier. Il est à utiliser avec des routes de type catch-all, permettant de capturer tout les appels à partir d'un point d'entrée.

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

## Créer un serveur de fichiers

Dans le fichier d'initialisation de votre application `index.ts`, les premières lignes ressemblent à ceci:

**File src/index.ts**
```typescript
import {jopiApp} from "jopi-rewrite";  
import myUsers from "./myUsers.json" with { type: "json" };  
  
jopiApp.startApp(import.meta, jopiEasy => {  
    jopiEasy.create_creatWebSiteServer();
    //...
});
```

Ici nous créons un simple site internet comme point de départ. Jopi offre d'autre options, permettant de créer des serveur spécialisés. Dont la fonction `create_fileServer`.

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

Dans cet exemple nous avons créé un serveur de fichier exposant le dossier `public`. Bien qu'il soit un serveur de fichier, le système de routes s'applique, faisant que ce serveur est aussi un serveur applicatif.
