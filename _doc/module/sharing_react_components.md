# Partager un composant React

## Le dossier @alias/uiBlocks

Ce dossier permet de définir de partager des composants React entre les différents modules. Tout ce que vous mettez dans ce dossier, sera accessible aux autres composants via un mécanismes très simple, ce que nous allons voir ici.

**Exemple de composant partagé**
```
|- mod_moduleA/
   |- @alias/
      |- uiBlocks/
         |- page.header/           < The component name
            |- index.tsx           < Expose the component
            |- default.priority    < Automatically added if missing      
```

## Partage un composant

Ici le composant que nous avons exposé, est nommé `page.header`. Son contenu est défini dans `index.tsx`de la façon suivantes:

**Content of index.tsx**
```typescript tsx
export default function() {  
    return <div>Page Header</div>  
}
```

## Utiliser un composant partagé

Pour accéder à ce composant, depuis n'importe quel module et n'import quel endroit de votre code, il vous suffit de faire ceci.

**Using the shared component**
```typescript tsx
import PageHeader from "@/uiBlocks/page.header";

export default function() {  
    return <>
      <div>The header:</div>
      <PageHeader />
    </>  
}
```
