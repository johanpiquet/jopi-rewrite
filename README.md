
## Qu'est-ce que Jopi Rewrite ?

Jopi Rewrite est un framework Bun.js, avec compatibilité Node.js, permettant de créer des sites internet ultra-rapides en utilisant React.js.

Son principe de fonctionnement est fortement comparable à Next.js :
* Côté serveur, React.js est utilisé pour générer le HTML des pages, lesquelles sont compatibles avec les moteurs de recherche (Google, Bing, ...). Côté navigateur, le HTML généré est automatiquement remplacé par son équivalent entièrement fonctionnel.
* Les pages et les API (GET/POST/...) sont définis en positionnant des fichiers dans des répertoires dont les noms sont directement reliés à la structure de l'url.

L'objectif de Jopi Rewrite, est la simplicité : pouvoir créer une application sans se noyer dans les aspects techniques. C'est pourquoi Jopi Rewrite n'est pas un simple serveur, mais aussi un framework. Il est minimaliste, mais avec des ajouts très appréciables :

* L'intégration native de Tailwind, qui déjà préconfiguré. Tout comme l'intégration de la technologie React HMR afin que la moindre modification du code de l'UI se répercute à la vitesse de l'éclair dans le navigateur.
* L'inclusion d'un script Docker afin de convertir immédiatement votre projet en une VM Docker très légère.
* La gestion de l'authentification avec JWT est intégré et activé de base, avec la possibilité de créer très simplement un répertoire d'utilisateur : un système minimaliste, très facile à comprendre et donc très facile à enrichir pour vos propres besoins.
* La gestion des droits utilisateurs (rôles) est incluse. Elle permet de limiter l'accès à certaines resources et de personnaliser des comportements selon les rôles de l'utilisateur.
* La gestion d'un cache rendant votre site aussi rapide qu'un site statique. Vous avez le contrôle complet sur ce cache, qui peut être global, par utilisateur, pour faire une distinction desktop / mobile, ...
* Créer un certificat SSL (pour le https) est trivial : Jopi génère des certificats de développement (machine locale) et gère aussi Let Encrypts : avec un renouvellement automatique et sans perte de connexion.


## Organisation d'une application

### Structure d'une application

Une application type ressemble à ceci en terme de dossiers.

**Exemple de projet Jopi**
```
|- node_modules/
|- package.json
|- tsconfig.json                       < If you use node.js / typescript
|- src/
   |- mod_moduleA                      < Code is always divided into modules
   |- mod_moduleB
	  |- @alias                        < Allows sharing between modules 
      |- @routes/admin                 < Define items bound to urls
         |- page.tsx                   < Bound to http://mysite/admin
         |- onPOST.ts                  < Catch all POST call to this url
         |- config.ts                  < If you want to configure some options
         |- pageNeedRole_admin.cond    < You can also use special file names
         |- postNeedRole_write.cond    < to avoidd use of config.ts
```

Comme indiqué en commentaire, il y a deux particularités : le code est toujours divisé en modules, tandis que les dossiers débutant par un arobase sont utilisés par des mécanismes de génération de code. Notamment le dossier `@alias` qui permet de partager des éléments entre les modules.
### La puissance d'une application modulaire

**L'organisation en modules*** permet d'introduire des séparations claires entre les différents aspects de votre code, et surtout il permet de réutiliser / partager des bloques de code entre plusieurs applications, tout en facilitant la division du travail dans une équipe. Par exemple, un module gère la structure du site, tandis qu'un autre gère la gestion des authentifications, et un troisième ajoute les pages correspondant aux produits commercialisés.

**Les modules peuvent partager des dépendances*** avec les autres modules grâce à des puissants mécanismes utilisant les fonctionnalités d'alias. Par exemple un module définit un composant MyComp, qui devient accessible pour tous les modules en faisant`import MyComp from @/uiBlocks/MyComp`.

Le système de modules de Jopi, a le grand avantage d'être compatible avec le pruning du code, que réalise son bundler interne afin de minimiser la taille des fichiers javascript générés (tout comme le font Vite.js et WebPack). C'est une précision importante, car ce prunning fait que certains motifs intéressants qui sont facilement réalisable côté serveur, deviennent la source d'erreur étrange, difficilement explicable, côté navigateur : car le bundler peut supprimer accidentellement certains morceaux de codes alors qu'ils sont nécessaires. C'est le cas des motifs événement / écouteurs. 

Cette complexité est la raison pour laquelle Jopi fournit lui-même les mécanismes, à travers une implémentation sans effets de bords avec les bundlers, et sans générer des fichiers javascript anormalement gros côté navigateur. 

* **Evénement / écouteurs** - Ce mécanisme permet aux modules de communiquer par un système souple de type "prévient moins lorsqu'il se passe ça".
* **Les composites** Ce mécanisme permet d'avoir des composants React.js dont le contenu est enrichi par des modules. Par exemple pour qu'un module puisse ajouter du contenu dans une barre d'outil.
* **Exposition et remplacement** Les modules peuvent exposer des éléments partagés entre eux. Par exemple un module pour exposer un composant `Product` faisant le rendu d'un produit. Tandis qu'un autre module peut décider de remplacer ce composant par une nouvelle version : ce qui se fait par un système de priorité. Le nouveau composant à une priorité plus élevée, et c'est pourquoi il remplace l'ancien. 

### Code serveur only, browser only?

Afin d'être rapide, Jopi n'a pas de système d'analyse du code et de retrait du code serveur. Cependant un mécanisme très intéressant a été ajouté afin de compenser: dès que le mot **jopiBundler_ifServer** est rencontré, alors il est remplacé par le mot **jopiBundler_ifBrowser**. Ainsi `import * as myLib from "./jopiBundler_ifServer.ts"` devient `import * as myLib from "./jopiBundler_ifBrowser.ts"` lorsque Jopi crée le javascript pour le navigateur.

En plus d'être performant, ce mécanisme permet d'être plus facile d'usage, tout en offrant des possibilité intéressate.

En interne, Jopi Rewrite utilise une librairie nommée **Jopi Toolkit**. Cette librairie regroupe tout un ensemble d'outils non spécifiques à Jopi Rewrite et pouvant être utilisé dans des projets indépendants. Cette librairie a la particularité d'utiliser ce mécanisme de traduction (jopiBundler_ifServer vers jopiBundler_ifBrowser) afin que tout le code serveur soit automatiquement retiré ou remplacé par une partie spécifique au navigateur.
## Cookbook

La documentation est organisée sous la forme d'un cookbook : vous voulez faire ça, voici comment faire.

### Les bases

[Démarrer un nouveau projet.](_doc/basic/new_project.md)
[Les 4 fichiers d'initialisation.](_doc/basic/init_files.md)

[Associer une page à une url.](_doc/basic/bind_page_to_url.md)
[Utiliser des urls paramètrées.](_doc/basic/use_parametred_url.md)
[Utiliser des urls catch-all.](_doc/basic/use_catchall_url.md)
[Remplacer une route existante.](_doc/basic/override_an_existing_route.md)

[Activer le mode développeur.](_doc/basic/enable_developper_mode.md)
[Activer le HTTPS.](_doc/basic/enable_https.md)
[Activer le CORS.](_doc/basic/use_cors_middleware.md)

[Utiliser un middleware.](_doc/basic/use_middleware.md)
[Utiliser avec un reverse-proxy.](_doc/basic/use_with_reverse_proxy.md)
[Utiliser le cache de page.](_doc/basic/use_page_cache.md)

[Définir les pages d'erreur 401, 404 et 500](_doc/basic/define_error_pages.md)

### Les pages React.js

[Utiliser React Server Side.](_doc/react/what_is_react_ssr.md)
[Utiliser Tailwind CSS.](_doc/react/use_tailwind_css.md)

[Importer une CSS.](_doc/react/import_css.md)
[Utiliser un module CSS.](_doc/react/use_css_modules.md)
[Importer une image.](_doc/react/import_image.md)

[Modifier le titre de la page.](_doc/react/set_page_title.md)
[Utiliser les menus.](_doc/react/use_menus.md)

### Utiliser des modules

[Créer un module.](_doc/module/create_a_module.md)

[Partager des composants React.](_doc/module/sharing_react_components.md)
[Remplacer un composant déjà partagé.](_doc/module/replace_shared_component.md)

[Utiliser les composites.](_doc/module/use_composites.md)
[Communiquer avec les modules.](_doc/module/communicate_between_modules.md)

### Répondre à une requête

[Créer une réponse JSON](_doc/request/json_response.md)
[Créer une réponse HTML avec React](_doc/request/returns_html_with_react.md)

[Obtenir les données d'entrée.](_doc/request/get_received_data.md)
[Gérer les fichiers reçus.](_doc/request/manage_received_files.md)
[Vérifier les données d'entrée.](_doc/request/check_received_data.md)
[Renvoyer des fichiers.](_doc/request/return_files.md)

### Utilisateurs et rôles

[Définir une banque d'utilisateurs.](_doc/users/user_data_store.md)
[Authentifier un utilisateur.](_doc/users/login_the_user.md)

[Connaître l'utilisateur et ses rôles.](_doc/users/known_user_and_roles.md)
[Limiter l'accès à des rôles.](_doc/users/limit_access_to_roles.md)
