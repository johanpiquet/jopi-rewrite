
# Activer le mode développeur

## Qu'est-ce que le mode développeur?

Le mode développeur permet deux choses:
* Redémarrer automatiquement le serveur (option JOPI_DEV).
* Ou rafraichir automatiquement le contenu du navigateur (option JOPI_DEV_UI).

Le fonctionnement de l'option JOPI_DEV_UI fonctionnement différemment si vous utiliser Node.js ou Bun.js.

* Avec Node.js: le navigateur recharge toute sa page.
* Avec Bun.js: il utilise une méthode hybride nommée **React HMR** où l'état actuel de vos composants React (states et stores) n'est pas perdu. Cela donne l'impression d'une magie où seuls ce qui a changé est instantanément modifié dans votre code, sans que le reste ne change.

## Comment l'activer ?

Lorsque vous utiliser un template de projet pour créer votre projet Jopi Rewrite (npx jopi init) alors le fichier `package.json` expose deux scripts :

```json
{
	"script": {
	  "start": "JOPI_DEV=0 JOPI_DEV_UI=0 npx jopib src/index.ts",
	  "startNode": "JOPI_DEV=0 JOPI_DEV_UI=0 npx jopin dist/index.js",
	}
}
```

Ces lignes ont une apparence particulière :
* `JOPI_DEV=0 JOPI_DEV_UI=0` permet de définir les variable d'environnement JOPI_DEV et JOPI_DEV_UI avec la valeurs 0 (désactivé).
* `npx` est un outil de node.js, permettant d'exécuter l'outil jopib présent dans `node_modules/.bin` ou de le télécharger si il n'est pas présent (bunx avec bun.js).
*  `jopib` permet de démarrer la version bun.js de l'application. Tandis que son équivalent `jopin`permet de démarrer la version node.js. Ces deux outils ne font qu'éviter de saisir `--preload jopi-rewrite/loader --preload jopi-rewrite` dans les paramètres d'exécution de node/bun.

Les deux variables d'environnement, JOPI_DEV et JOPI_DEV_UI, permettent d'activer le mode développement:

* JOPI_DEV=1 permet d'activer le redémarrage automatique du serveur en cas de changement dans les sources.
* JOPI_DEV_UI=1 permet d'activer le refresh automatique en cas de changement dans un des fichiers liés au navigateur (React HMR pour Bun.js ou un simple refresh pour Node.js).
## Anomalies liées à React HMR

Des anomalies, non corrigeables, concernent l'usage de React HMR (bun.js + JOPI_DEV_UI=1) et ne s'appliquent qu'aux pages (voir `page.tsx`).

* **Sécurité** : les rôles ne peuvent pas être vérifiés.
* **Middleware**: les middlewares ne peuvent pas être exécutés.
* **Cache**: la mise en cache ne peut pas être utilisé.
