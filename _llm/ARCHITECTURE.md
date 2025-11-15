# Architecture

## A propos de ce document

Ce document décrit l'architecture de cette application.

## Organisation en modules

Cette section décrit la manière dont une application est découpée en modules et ce que les modules permettent de faire.

---

### Déclarer un module

Le code est organisé en modules. Chaque module est un dossier situé dans le dossier `src` à la racine du projet, et 
dont le nom commence par `mod_`. Chaque dossier débutant par `mod_` est un module. Le nom du module est ce qui se 
trouve après le préfixe `mod_`.

Pour créer un module, il faut donc créer un dossier dont le nom début par `mod_` à la racine du dossier contenant 
les sources de l'application.

* **Exemple 1**
  * **Dossier :** `src/mod_myFirstModule/`
  * **Nom du module :** `myFirstModule`
* **Exemple 2**
  * **Dossier :** `src/mod_mySecondModule/`
    * **Nom du module :** `mySecondModule`

### 2. Le contenu d'un module

Chaque module contient deux dossiers spéciaux qui sont optionels: `@alias` et `@routes`.

* Le dossier `@alias` permet de partager des éléments entre plusieurs modules.
* Le dossier `@routes` permet de définir des routes.

Chaque module contient aussi deux fichiers spéciaux qui sont optionels: `serverInit.ts` et `uiInit.tsx`.

* Le fichier `serverInit.ts` permet de définir des règles de configuration du serveur.
* Le fichier `uiInit.tsx` permet de définir des règles de configuration exécutées dans le navigateur.

Exemple de contenu d'un module
```
|- src/
   |- mod_moduleA/        < Défini le module `moduleA`
      |- @alias/          < Défini les éléments partagés entre modules
      |- @routes/         < Défini les routes
      |- serverInit.ts    < Pour configurer le serveur
      |- uiInit.tsx       < Pour configurer le navigateur
```

#### Le fichier `serverInit.ts`

Le fichier `serverInit.ts` est un fichier optionel. Il expose une fonction principale, qui est appellée lorsque le 
serveur web démarre. Son but est de configurer le serveur web.

```typescript
// src/mod_myModule/serverInit.ts

import {JopiEasyWebSite} from "jopi-rewrite";

export default async function(webSite: JopiEasyWebSite) {
    // Here: code which configure the server.
}
```

#### Le fichier `uiInit.tsx`

Le fichier `uiInit.ts` est un fichier optionel. Il expose une fonction principale, qui est appellée lorsque le 
navigateur affiche une page du site internet. Son but est de configurer les éléments du navigateur.

```typescript
// src/mod_myModule/uiInit.tsx

import {UiKitModule} from "jopi-rewrite/uikit";

export default function(myModule: UiKitModule) {
  // Here: code loaded inside the navigator.
}
```

## Déclaration de routes

Cette section décrit la convention de routage utilisée.
L'objectif est de permettre de comprendre comment les routes HTTP sont définies et mappées aux contrôleurs de routes.

---

### Structure de Base

Le système de routage est basé sur la **structure des dossiers** au sein de chaque module.

Ici nous allons voir:
* Comment chaque module peut définir des routes.
* Comment ajouter des contrôleurs pour ces routes.

### Définition des Routes

Caque module (ex: `mod_myFirstModule`, `mod_mySecondModule`) contient un répertoire dédié à la définition de ses 
routes. Ce dossier est nommé `@routes`.  Exemple: `src/mod_myFirstModule/@routes`.

Chaque route est associée à un dossier dans le dossier `@routes`. Le chemin de ce dossier, indique le chemin de la 
route. Ce qui importe, est le chemin que forme ce dossier.

* **Exemple 1**
    * **Dossier :** `src/mod_user/@routes/settings/`
    * **Correspondance URL :** `/settings`
* **Exemple 2**
    * **Dossier :** `src/mod_moduleName/@routes/product/computer/`
    * **Correspondance URL :** `/product/computer`

### Définition d'une route paramétrées

Une route paramétrée est une route dont la valeur de certains morceaux n'est pas connue par avance. L'usage de 
crochets permet de définir le fait que nous utilisons une route paramétrée.

* **Exemples de nom de segment**
  * `[routeSegmentName]` définit une route paramétrée dont le nom du paramètre est `routeSegmentName`.
  Exemple de dossier déclarant la route: `@routes/before/[routeSegmentName]/after`.
  * `[productName]` définit une route paramétrée dont le nom du paramètre est `productName`.
    Exemple de dossier déclarant la route: `@routes/product/[productName]`.
  * `[userName]` définit une route paramétrée dont le nom du paramètre est `userName`.
    Exemple de dossier déclarant la route: `@routes/users/[userName]`.

* **Exemple de routes paramétrées**
  * **Exemple 1**
    * **Le dossier**: `src/mod_user/@routes/product/[productName]/listing`
    * **Définit:** le paramètre `productName`.
    * **Il répond aux urls**:
      * `/product/computer/listing`
      * `/product/furnitures/listing` 
      * `/product/desktop/listing`.
    * Note: ici les mots `computer`, `furnitures`, `desktop` sont des exemples et peuvent être remplacés par 
      n'importe quel morceau d'url.

  * **Exemple 2**
    * **Le dossier**: `src/mod_user/@routes/user/[userName]`
    * **Définit:** le paramètre `userName`.
    * **Il répond aux urls**:
      * `/user/johan`
      * `/user/paul`.
    * Note: ici les mots `johan` et `paul`, `desktop` sont des exemples et peuvent être remplacés par
      n'importe quel morceau d'url.

### Définition d'une route catch-all

Une route catch-all est une route dont le dernier dossier a pour nom `[...]`.
Le rôle d'une route catch-all, est de cibler toutes les urls débutant par la route indiquée.

**Exemples**
* La route `@routes/admin/[...]` permet de répondre à toutes les url début par `/admin/`.
* La route `@routes/product/properties/[...]` permet de répondre à toutes les url début par `/product/properties/`.

### Association de controlleurs à une route

Chaque route peut être associée à des controlleurs, permettant de savoir comment traiter un appel HTTP sur l'url 
associée à la route.

Le nom des fichiers contenus dans le dossier d'une route, a une importance et permet d'indiquer son rôle.
* Les fichiers `onGET.ts` permettent d'associer un contrôlleur aux appels de type GET.  
* Les fichiers `onPOST.ts` permettent d'associer un listener aux appels de type POST.  
* La même logique s'applique avec tous les verbes HTTP (GET, POST, PUT, ...).

* **Exemple 1**
  * **Fichier :** `src/mod_user/@routes/settings/onGET.ts`
  * **Correspondance URL :** `/user/settings`
  * **Verbe HTTP :** `GET`

* **Exemple 2**
  * **Fichier :** `src/mod_user/@routes/settings/onPOST.ts`
  * **Correspondance URL :** `/user/settings`
  * **Verbe HTTP :** `POST`

* **Exemple 3**
    * **Fichier :** `src/mod_otherModule/@routes/product/preview/onDELETE.ts`
    * **Correspondance URL :** `/product/preview/settings`
    * **Verbe HTTP :** `DELETE`

### Définition d'un contrôleur

Le contrôlleur expose une fonction qui est appellé lors de l'appel HTTP.

* Elle est définie dans un fichier, dont le nom indique le verbe HTTP géré.
* Cette fonction reçoit un argument de type `JopiRequest`.
* Elle renvoie une réponse de type `Response` (of the standard FETCH API).
* Elle doit être asynchrône.

**Exemple de contrôlleur** 
```typescript
// src/mod_user/@routes/settings/onPOST.ts

import {JopiRequest} from "jopi-rewrite";

// Respond to : POST /user/settings
export default async function(req: JopiRequest) {
    return new Response("My response");
}
```

### Restriction d'accès

Il est possible de définir des restrictions d'accès pour une route, afin d'imposer une liste de rôles que
l'utilisateur connecté doit posséder. La manière d'imposer une restriction, se fait à travers des fichiers dont le
nom est analysé et interprété.

Ces fichiers ont la nomenclature suivante: `[httpVerb]NeedRole_[roleName].cond`.
* La partie `[httpVerb]` est optionnelle.
  * Elle indique le verbe HTTP sur lequel la restriction porte (`get`/`post`/...).
  * Elle est toujours indiquée en minuscule.
* La partie `[roleName]` est obligatoire.
  * Elle indique quel rôle est requis.

**Exemple**
* Le fichier `@routes/my/route/putNeedRole_admin.cond` indique que l'appelle `PUT /my/route` nécessite que l'appelant
  ait le rôle 'admin'.
* Le fichier `@routes/my/route/getNeedRole_writer.cond` indique que l'appelle `GET /my/route` nécessite que l'appelant
  ait le rôle 'writer'.
* Le fichier `@routes/my/other/route/needRole_reader.cond` indique que tous les appels à la `/my/other/route`
  nécessitent que l'appelant ait le rôle 'reader', quelque-soi la méthode HTTP.

Si plusieurs contraintes sont définies, alors l'utilisateur doit remplir l'ensemble des contraintes.

**Exemple**
Si pour une route j'ai le fichier `getNeedRole_writer.cond` et le fichier `needRole_reader.cond` alors l'appelant
faisant un appel GET doit avoir les rôles `writer` et `reader`. Il doit posséder ces deux rôles afin d'être autorisé.

### Les fichiers `page.tsx`

Chaque route peut exporter un fichier `page.tsx`. Il est appelé lors d'un appel HTTP de type GET.

Son rôle est similaire au fichier `onGET.ts` mais ajoute des traitements automatiques afin de pouvoir
générer une réponse HTML à partir d'un composant React.js.

* **Exemple**
  * **Fichier :** `src/mod_moduleName/@routes/my-route/page.tsx`
  * **Correspondance URL :** `/my-route`
  * **Verbe HTTP :** `GET`
  * **Action :** Génère un rendu HTML à partir d'un composant React.js

```typescript jsx
// src/mod_moduleName/@routes/my-route/page.tsx

// Respond to : GET /my-route
export default function(
    {params, searchParams}:
    {
        params: Record<string, string>,
        searchParams: Record<string, string | string[]>
    })
{
    // Here we use Tailwind CSS for classes.
    // You can use it when you write code.
    //
    return <div className="text-blue-400">My React.js component</div>
}
```

Si un fichier `onGET.ts` et un fichier `page.tsx` existent en même temps, alors:
* Le fichier `page.tsx` a la priorité.
* Le fichier `onGET.ts` est ignoré.

La fonction exposée par le fichier `page.tsx` reçoit deux paramètres :
* **searchParams**: il contient des informations liées à la query-string dans l'url requêtée.
  * Exemples
    * Si l'url est `/my-route?q=5` alors `searchParams` aura la valeur `{q: "5"}`.
    * Si l'url est `/my-route?q=5&q=6&sort=ASC` alors `searchParams` aura la valeur `{q: ["5", "6], sort: "ASC"}`.
* **params**: il contient la valeur des routes paramétrées.
  * Exemples
    * Si nous déclarons une route paramétrée avec le paramètre `userName` et `userGroup` alors `params` sera un 
      object contenant les propriétés `userName` et `userGroup` dont les valeurs correspondront aux morceaux 
      d'url associés à ces paramètres.
    * Example:
      * La route `@routes/user/[usergroup]/[userName]` définit deux paramètres (`userGroup` et `userName`).
      * Pour l'url `/user/admin/johan` la variable `param` reçoit la valeur `{userGroup: "admin", userName: "johan"}`.

### Mise en cache des fichiers `page.tsx`

Le fichier `page.tsx` exporte un composant React.js qui est transformé en HTML par le serveur. Parce que cette 
opération est coûteuse en ressources, le résultat du calcul est automatiquement mis en cache.

Le fichier `cache.disable` permet de désactiver ce cache pour une route.

**Exemple** Le fichier `@routes/product/search/cache.disable` permet de désactiver le cache pour la route `product/search`.

## Structure d'une application

Cette section décrit la structure de l'application avec ses principaux fichiers et dossiers.

### Le dossier racine du projet

Voici la liste et le rôle des fichiers à la racine du projet.

```
|- package.json      < Le projet node.js
|- tsconfig.json     < Les règles typescript
|- src/              < Contient les sources du projet en TypeScript
|- dist/             < Le dossier src/ compilé de TypeScript vers JavaScript
|- bunfig.toml       < Contient des règles particulières pour Bun.js
|- global.css        < Contient des règles CSS pour Tailwind CSS
```

#### Le fichier `bunfig.toml`

Ce fichier permet de configurer le comportement de **bun.js**

Son contenu doit contenir les éléments suivants:
```toml
[serve.static]
plugins = [
    # Allow compiling Tailwind.
    "bun-plugin-tailwind",
    # Add jopi-rewrite requirements.
    "jopi-rewrite/bun-server-static"
]
```

#### Le fichier `global.css`

Ce fichier permet d'initialiser Tailwind.css et de configurer ses comportements.

Son contenu doit contenir les éléments suivants:

```CSS
@import "../../../node_modules/tailwindcss/dist/lib.d.mts";
```

#### Le fichier `package.json`

Ce fichier définit notre projet node.js / bun.js.
Il doit contenir les éléments suivant:

```json
{
  "type": "module",
  "scripts": {
    "build": "npx tsc",
    "start": "JOPI_LOG=0 JOPI_DEV=0 JOPI_DEV_UI=0 npx jopib src/index.ts",
    "startNode": "JOPI_LOG=0 JOPI_DEV=0 JOPI_DEV_UI=0 npx jopin dist/index.js"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "@types/react": "^19.1.8",
    "@types/react-dom": "^19.1.6"
  },
  "dependencies": {
    "jopi-rewrite": "latest"
  },
  "jopi": {
    "webSiteUrl": "http://127.0.0.1:3000"
  }
}
```

La valeur `webSiteUrl` indique l'url du site internet devant être écouté.
Cette valeur est optionnelle si la variabl d'environnement `JOPI_WEBSITE_LISTENING_URL` ou `JOPI_WEBSITE_URL` est définie.

#### Le fichier `tsconfig.json`

Ce fichier définit les règles de compilation pour TypeScript.
Il est responsable de définir comment compiler le dossier '/src' vers le dossier '/dist'.

Il doit contenir les éléments suivants:
```json
{
  "compilerOptions": {
      "sourceMap": true,
      "declaration": true,
      "preserveSymlinks": true,
  
      "types": ["jopi-rewrite/types", "@types/bun"],
      "baseUrl": ".",
  
      "paths": {"@/*": ["./src/_jopiLinkerGen/*"]},

      "outDir": "./dist",
      "rootDir": "./src",
  
      "lib": ["ES2022", "DOM", "DOM.Iterable"],
  
      "jsx": "react-jsx",
      "target": "ESNext",
      "module": "ESNext",
      "moduleResolution": "Bundler",

      "strict": true,
      "skipLibCheck": true,
      "noEmitOnError": false
  },

  "include": ["./src/**/*.ts","./src/**/*.tsx"],
  "exclude": ["node_modules","dist"]
}
```

### Le dossier `src/`

Voici la liste et le rôle des fichiers à la racine du dossier 'src/'.

```
|- _jopiLinkerGen    < Un contenu généré dynamiquement par le compilateur interne
|- index.ts          < Le point d'entrée de l'application.
|- mod_moduleA       < Un module
|- mod_otherMod      < Un autre module
```

Le dossier `_jopiLinkerGen` contient du code source qui est généré dynamiquement par l'application au démarrage.
Il ne faut jamais modifier manuellement le contenu de ce dossier.

#### Le fichier `index.ts`

Ce fichier est le point d'entrée du programme, celui qui est directement appelé lorsque l'application démarre.

Voici un exemple de contenu minimaliste.

```typescript
import {jopiApp} from "jopi-rewrite";

jopiApp.startApp(import.meta, jopiEasy => {
    jopiEasy.create_creatWebSiteServer();
});
```