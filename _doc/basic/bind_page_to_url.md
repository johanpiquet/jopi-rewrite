# Associer une page à une url

## Le dossier "@routes"

Une fois créé, votre projet ressemble à ceci.

```
|- node_modules/
|- package.json
|- tsconfig.json
|- src/
   |- mod_moduleA/
      |- @routes/        < The interesting part is here
   |- mod_moduleB/
	  |- @routes/        < Each module can declare routes 
```

Chaque module (ici moduleA et moduleB) possède un dossier `@routes` dont le contenu est interprété afin de savoir à quelle fonction associer une url. Chaque répertoire, correspond à un segment d'url. Tandis que les fichier nommés `page.tsx` permettent de définir le contenu à afficher.

Afin de comprendre, voici quelque exemples. 
* Le fichier `@routes/welcome/page.tsx` correspond à l'url `http://mysite/welcome`.
* Le fichier `@routes/products/listing/page.tsx` correspond à l'url `http://mysite/product/listing.
* Le fichier `@routes/page.tsx` correspond à la page d'accueil `http://mysite/`.

## Exemple de route

L'exemple suivant définit une route, tout en donnant un aperçu des fichiers pouvant se trouver dans le dossier. Chaque élément sera expliquer et détaillé ensuit.

```
|- @routes/product/listing
   |- page.tsx                   < Response to GET call
   |- onPOST.ts                  < Reponse to POST call
   |- onPUT.ts                   < Same for PUT/PATCH/OPTIONS/DELETE
   |- postNeedRole_Admin.cond    < Constraint on caller roles
   |- postNeedRole_Writer.cond.  < Add a second constraint.   
   |- high.priority              < Set a priority
   |- config.ts                  < Allows others setting (like cache)
   |- cache.disable              < Disable the automatic cache
```

## Le fichier "page.tsx"

Les fichiers **page.tsx** permettent que l'url répond avec le contenu d'une page React. Le contenu React est transformé en HTML par le serveur, affiché dans le navigateur. Puis une fois le javascript chargé, tout ce qui est gestion des événements devient fonctionnelle : l'utilisateur peut interagir avec le contenu.

**Exemple de fichier page.tsx**

```typescript tsx
import "./my-style.css";  
import {usePageTitle} from "jopi-rewrite/ui";

export default function() {  
	usePageTitle("My title");

    return <div onClick={()=>alert('click')}>
	    Click me!
	</div>
}
```

## Le fichier "onPOST.ts"

Le fichier `onPOST.ts` (ou onPOST.tsx) permet de définir la fonction répondant à un appel de type POST sur l'url.

**Exemple de fichier onPOST.ts**

```typescript tsx
import {JopiRequest, type LoginPassword} from "jopi-rewrite";  
  
export default async function(req: JopiRequest) {  
    const data = await req.getBodyData();  
    const authResult = await req.tryAuthWithJWT(data as LoginPassword);  
  
    if (!authResult.isOk) console.log("Auth failed");  
  
    // Will automatically set a cookie.  
    // It why we don't core of the details here.   
    return req.jsonResponse({isOk: authResult && authResult.isOk});
}
```

> Vous pouvez faire la même chose avec les autres méthodes HTTP (PUT/PATCH/DELETE/...)

## Le fichier "config.ts"

Le fichier `config.ts` permettent de modifier la configuration pour une route.

Les trois éléments les plus utiles sont :

* La configuration de middlewares.
* La configuration du cache pour les pages.
* La configuration des rôles.

```typescript
import {RouteConfig} from "jopi-rewrite";  
  
export default function(ctx: RouteConfig) {  
    // GET call will need the user to have  
	// the roles "admin" and "writer".
	ctx.onGET.addRequiredRole("admin", "writer");  
}
```

## Les fichiers de conditions (.cond)

Les fichier dont l'extension est `.cond`permettent de définir des conditions à propos des rôles. Le nom de ces fichiers contient des informations qui seront décodés et correspondant à la nomenclature suivante : `whatNeedRole_roleName.cond`.

Les exemples suivants permettent de comprendre:
* **postNeedRole_admin.cond** : signifie que les appels de type POST nécessitent que l'utilisateur ait le rôle "admin".
* **getNeedRole_writer.cond** : signifie que les appels de type GET nécessitent que l'utilisateur ait le rôle "writer".

Si plusieurs contraintes portent sur une même méthodes, alors elles se cumulent. Par exemple si les fichiers **getNeedRoole_writer.cond** et **getNeedRole_admin.cond** sont tout deux présents, alors l'utilisateur devra avoir les rôles writer et admin en même temps (et non pas l'un ou l'autre).

> Ici le mot `page`est un alias pour `get`. Ainsi écrite `pageNeedRole_writer` est équivalent à écrire `getNeedRole_writer`.


## Les fichiers de priorité (.priority)

Chaque module peut définir des routes, et ajouter de nouvelles routes. Il est aussi possible qu'un module remplace une route existante. Lorsque c'est le cas, Jopi doit être capable de savoir à quel module donner la priorité : qui verra sa route utilisée, et qui sera ignoré.

Le rôle des fichiers de priorité, est d'indiquer quel module est plus prioritaire.

Les priorités sont les suivantes, par ordre du moins prioritaire au plus prioritaire :  `verylow.priority`, `low.priority`,  `default.priority`, `high.priority`, `veryhigh.priority`.

## Le fichier "cache.disable"

Par défaut les pages React.js sont mises en cache. Le fichier `cache.disable` permet de désactiver ce cache automatique.

Vous pouvez aussi le faire depuis le fichier `config.ts` et y définir des règles de mise en cache.