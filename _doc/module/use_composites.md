# Utiliser les composites

## Ce que sont les composites

Supposons que vous ayant une liste de composants React.js que vous affichez. Vous aimeriez que le contenu de cette liste puisse être enrichi par d'autres modules. Ce besoin est le but des composites.

Un composite est un composant React.js dont le contenu peut être étendu par des modules : tout en étant compatible avec les bundlers (Vite.js/WebPack, et surtout le bundler interner de Jopi).

## Pourquoi utiliser les composites ?

Cette compatibilité avec les bundlers est la difficulté de ce type de motifs, car soit le système de prunning des bundlers introduit d'étranges anomalies difficiles à comprendre. Soit vous êtes obligé de pré-charger le code de vos composants, lequel est inclut même là où il n'est pas nécessaire.

C'est pourquoi Jopi propose un motif destiné à implémenter un tel système de façon élégante et compatible. 

## Créer un composite

Les composites sont déclarés de façon statique, d'une façon similaires au système d'événements vu précédemment. Chaque module peut enrichir un composite existant.

```
|- mod_moduleA/
 |- @alias/
  |- uiComposites/       < Where our composites are declared
   |- comp1              < The name for the composite
	  |- a1              < Names determine the composites order (sorted ASC)
	     |- index.tsx    < Export the React component
      |- a2
      |- a3
|- mod_moduleB/      
 |- @alias/
  |- uiComposites/
   |- comp1                < moduleB will extend our composite
      |- a2b               < Here we add an item to the list (4th position)
	  |- a1                < The name is an indication for list item order
	     |- index.tsx      <   but allows overriding an exising element.
	     |- high.priority  < This priority allows to know who override
	                           and who is overriden.
```

Comme indiqué dans l'exemple, il est possible d'écraser un composant de même nom. Pour cela il faut que celui qui écrase, ait une priorité supérieure à celui qui sera écrasé. La priorité par défaut est `default.priority`. 

## Utiliser un composite

Utilise un composite est très simple. Voici un exemple pour le composite créé en exemple.

```typescript tsx
import MyComposite from "@/uiComposites/comp1";  
    
export default function() {
    return <MyComposite />  
}
```

Ici, le composant MyComposite inclut les éléments a2, a2, a2b et a3, dans l'ordre indiqué.

> Si vous examiné le code généré par le bundler, vous verrez que tout est optimisé, dans le sens où aucun élément de MyComposite n'est inclut si MyComposite n'est pas utilisé.