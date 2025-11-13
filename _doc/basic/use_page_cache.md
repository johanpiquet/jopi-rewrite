
# Utiliser le cache de page

## Les pages sont mises en cache

Par défaut, Jopi met en cache toutes les pages React.js afin que le site soit davantage réactif (fichiers `page.tsx`). Ces caches rendent l'ensemble aussi rapide que ce que permettrait l'usage de fichiers statiques, faisant que convertir le site en un site statique n'offrira pas de gains de performances.
## Deux caches sont proposés

Par défaut Jopi utilise un cache mémoire, cependant un cache disque haute performance est proposé.

**Activation du cache disque***
```typescript
import {jopiApp} from "jopi-rewrite";  
  
jopiApp.startApp(import.meta, jopiEasy => {  
    jopiEasy.create_creatWebSiteServer()  
        .configure_cache()  
            .use_fileSystemCache(".cache")  
            .END_configure_cache()
});
```

## Personnaliser le cache

Le cache peut être personnalisé de façon globale, tout en ajoutant des exceptions route par route.

Il vous est possible de :
* Désactiver le cache automatique globalement, ou pour des routes.
* Modifier ce qui va être stocké dans le cache.
* Modifier ce qui est chargé depuis le cache.
* Agir avant la vérification du cache.

### Désactiver le cache par une route

Vous pouvez désactiver le cache pour une route de trois façons.

1. En ajoutant un fichier `cache.disable` dans le dossier de la route.
2. A travers une option, dans le fichier `config.ts`de la route.
3. Lors de la création du serveur.

**Usage du fichier config.ts**
```typescript.
import {RouteConfig} from "jopi-rewrite";  
  
export default function (config: RouteConfig) {  
    config.onGET.cache_disableAutomaticCache();
    
    // Others possible rules:
	// - cache_afterGetFromCache
	// - cache_beforeAddToCache
	// - cache_beforeCheckingCache
}
```

**Exemple lors de la création du serveur**
```typescript
import {jopiApp} from "jopi-rewrite";  
import myUsers from "./myUsers.json" with { type: "json" };  
  
jopiApp.startApp(import.meta, jopiEasy => {  
    jopiEasy.create_creatWebSiteServer()  
        .configure_cache()
            .add_cacheRules({  
                // The regexp is optional.
                // If set, allows to validate the route
                // and known if this rule apply to this route.
                //
                regExp: /\/users\/.*$/,
                
                // This rules allows disabling
                // the cache for this route.
                //
                disableAutomaticCache: true,
                
                // Others possible rules:
                // - afterGetFromCache
                // - beforeAddToCache
                // - beforeCheckingCache
            }).
            
            // We can add more than one rule.
            .add_cacheRules({
	            regExp: /\/card\/.*$/,
	            disableAutomaticCache: true,
            })
            
            .END_configure_cache()    
    });
```

### Personnaliser le cache

Les règles `afterGetFromCache`, `beforeAddToCache` et `beforeCheckingCache` peuvent être définis de la même façon, afin la manière dont le cache est lu et écrit.