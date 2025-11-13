# Utiliser Tailwind CSS

## Qu'est-ce que Tailwind CSS ?

Tailwind CSS est un ensemble de classes CSS outil, dont l'usage évite l'usage de styles CSS. La particularité de Tailwind, est qu'il propose un très grand nombre de classes CSS outil, mais il n'inclut que celle que vous utilisez.

Cette particularité permet que les feuilles de style générées restent petites et optimisée. La contrepartie, est que Tailwind doit scanner votre code et analyser ce qu'il utilise, ce qui implique une étape de configuration parfois fastidieuse : ce qui n'est pas le cas avec Jopi, car **Tailwind est déjà configuré et activé par défaut**.

## Désactiver Tailwind CSS

Tailwind CSS est déjà configuré et activé. Si son usage n'est pas adapté à votre projet, alors voici comment le désactiver depuis le fichier **index.ts** à la racine de votre projet:

**Désactivation de Tailwind**
```typescript
jopiEasy
	   .configure_tailwindProcessor()
	   .disableTailwind();
```

## Définir la "global.css"

Le moteur Tailwind a besoin d'un fichier `global.css` pour fonctionner, qu'il recherchera au démarrage. Il est possible de le définir de plusieurs façons, ce que nous indiquons ici par ordre de priorité.

1. En indiquant programatiquement où il se trouve, ou son contenu.
2. Si vous utilisez **ShadCN** alors la configuration du fichier `components.json`sera utilisé.
3. Si un fichier `global.css` est trouvé à la racine du projet alors il sera utilisé (à côté de `package.json`).
4. Autrement, il utilisera directement le contenu `@import "tailwindcss";`

Voici un exemple montrant comment définir programatiquement l'endroit où se trouve ce fichier (option 1).

```typescript
jopiEasy 
    .configure_tailwindProcessor()  
    .setGlobalCssFilePath("./global2.css");
```