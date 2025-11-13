# Remplacer un composant partagé

Chaque module peut exposer des composants React que les autres modules peuvent utiliser. Parfois, pour les besoins de votre application, vous aimeriez pouvoir remplacer un composant par un autre version.

Pour remplacer un composant, il suffit de déclarer un composant de même nom, et de lui donner une priorité plus élevée.

```
|- mod_moduleA
|  |- @alias/uiBlocks/page.header
|     |- index.tsx
|     |- default.priority          < Automatically aded if no priority
|- mod_moduleB
|  |- @alias/uiBlocks/page.header
|     |- index.tsx
|     |- high.priority             < Is higher priority
```

Ici, le composant `page.header` du module moduleB a une priorité plus élevée. C'est pourquoi sa version du composant est celle qui sera utilisée.

Les différents niveaux de priorités sont :
* verylow.priority
* low.priority
* default.priority
* high.priority
* veryhigh.priority

Le système supporte plusieurs variantes de nomage, pour ces fichiers. Il le passe en minuscule et retirer les caractère tirets et traits-bas. Ainsi vous pouvez écrire `Very-Low.priority`ou `very_low.priority`. Ils seront automatiquement renommés en `verylow.priority`.

L'intérêt des niveaux verylow et low, est qu'un élément sans priorité, ce qui signifié une priorité de niveau default, va automatiquement écraser l'existant. Utiliser verylow et low, est donc une façon de définir une valeur par défaut pour un élément.