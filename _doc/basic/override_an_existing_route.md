# Remplacer une route existante

Un module, peut définir une route déjà existante. Dans ce cas, la nouvelle déclaration écrase la nouvelle déclaration. Si vous déclarez une page à l'aide d'un fichier `page.tsx` alors elle écrase la précédente si celle-ci existait déjà. De même pour `onPOST.ts`, `onPUT.ts`, ...

Le problème est l'ordre dans lequel les modules sont évaluer. Qui va écraser qui ?

C'est pourquoi un mécanisme de priorités permet de dire qui est plus prioritaire.

```
|- mod_moduleA
   |- @routes/product/listing/
   	   |- default.priority           < Is automatically created if no priority
	   |- page.tsx
       |- onPOST.ts
|- mod_moduleB
   |- @routes/product/listing/	
   	   |- high.priority              < Priority is higher
       |- page.tsx                   < ... it's why it will replace the page
       |- onPUT.ts                   < onPUT is added (+ the old onPOST)
```

Les différents niveaux de priorités sont :
* verylow.priority
* low.priority
* default.priority
* high.priority
* veryhigh.priority

L'intérêt des niveaux verylow et low, est qu'un élément sans priorité, ce qui signifié une priorité de niveau default, va automatiquement écraser l'existant. Utiliser verylow et low, est donc une façon de définir une valeur par défaut pour un élément.