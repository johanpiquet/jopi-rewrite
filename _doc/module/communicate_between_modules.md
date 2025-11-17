# Communication inter-modules

## Le principe de communication par événements

Les modules sont fortement découplés entre eux, ce qui réduit leurs liens et permet une application plus facile à maintenir. Ils peuvent partager des éléments, cependant parfois il faut qu'ils soient capable de communiquer entre eux de façon plus directe.

C'est là où intervient un mécanisme où un module peut prévenir les autres modules qu'un événement se produit, tout en transmettant des informations. Ici c'est comme avoir un haut-parleur et parler dedans : qui entend ? Nous ne savons pas, cependant ce qui est dit est entendu et provoque des réactions.

Par exemple, un événement peut indiquer que l'utilisateur vient de se connecter : avec pour conséquence que le module gérant l'UI va demander à réactualiser le contenu des menus afin de refléter le fait que l'utilisateur n'est plus un utilisateur anonyme.
## Le problème des événements

Le mécanisme de communication proposé, est donc un mécanisme par événements. Le soucis d'un tel mécanisme, est qu'il est incompatible avec les bundler (Vite.js / WebPack / ...) hors en interne Jopi utilise lui aussi un bundler. Si vous essayez de mettre en place un tel mécanisme, alors vous constaterez des comportements en apparence incohérents, du à des effets de bord des système prenant le javascript pour créer un bundler.

La raison de ces effets de bord, est que le bundler réalisent une analyse statique : ils n'exécutent pas le code pour savoir qui écoute un événement. Puis ils réalisent un pruning : ils retirent le code qui semble être sans attache avec le reste du système, cela afin de générer des fichiers javascript bien plus petits.

Cette problématique, est la raison pour laquelle Jopi impose que les événements soient déclarés de façon statique, de façon à ce qu'ils puissent être analysés par le bundler et que le code javascript soit correctement inclut.

## Ecouter un événement

Les événements sont déclarés de façon statique, de manière à ce que le bundler interne puisse comprendre que notre module écoute certains éléments.

**Exemple d'ajout d'écouteurs**

```
|- mod_moduleA/
 |- @alias/
  |- events/                 < Where our module events are declared
   |- myEventName            < The name for this event
	  |- listenerA           < Names determine the event order (sorted ASC)
	     |- index.ts         < Who listen to this event
    |- mySecondListener
    |- myThirdListener
```

Chaque écouteur a un nom. Le but de ce nom, est d'indiquer son ordre de priorité dans la liste d'appel des événements. Ces noms sont triés alphabétiquement (ASC) ce qui permet de savoir qui doit être appelé ou après.

Ici le fichier `index.ts` expose une fonction par défaut qui est appelée lorsque l'événement est appelé. Cette fonction doit être synchrone (pas de `async` / `Promise`). La raison est que concrètement la plupart des événements sont appelés depuis des fonctions synchrones, faisant que si les événements étaient asynchrones alors il y aurait incompatibilité.

**Fichier index.ts**
```typescript
export default function(eventData: any, eventName: string) {
  console.log(`Event ${eventName} received with data`, eventData);
}
```

## Emettre un événement

Voici un exemple montrant comment émettre un événement.

```typescript
import myEventName from "@/events/myEventName";
await myEventName.send({hello: "world"});
```

L'unique contrainte ici, est que l'événement doit exister. Il faut donc créer une déclaration d'événement, même si celui-ci n'a pas d'écouter.

**Déclaration d'un événement sans écouteurs**
```
|- mod_moduleB/
  |  @alias/
     |- events/ 
        |- myEventB    < There is no listener, but nowthe event exist
```

Une autre méthode pour appeler les événements, est l'utilisation directe de `jk_events`. Cette méthode existe, mais elle est déconseillée côté UI pour les raisons exposées quant au linker. C'est pourquoi elle est citée ici, mais déconseillée.

```typescript
import * as jk_events from "jopi-toolkit/jk_events";
jk_events.sendAsyncEvent("myEventName", entry);
```