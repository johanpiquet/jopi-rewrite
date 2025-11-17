
# Utiliser un module CSS

Un module CSS est un morceau de CSS dont les noms sont automatiquement renommés afin d'éviter les conflits. C'est là le premier avantage des modules CSS.

Leur second avantage, est que le contenu des modules CSS est directement intégré dans le HTML généré, sans usage d'un fichier externe. Tandis que si le composant incluant le CSS module n'est pas utilisé, alors le contenu CSS n'est pas intégré : seul ce qui est utilisé est inclus.

Supposant que nous avons ce fichier CSS, nommé `mystyle.module.css` (la partie module.css est importante ici).

```css
.myText {  
    color: blue;  
    font-size: 40px;  
}  
  
.myButton {  
    border: 1px solid red;  
}
```

Dans ce fichier les noms de classes sont simples, et facilement sujet à conflit. Ce qui n'est pas un problème parce qu'ils seront renommés vers des noms uniques.

Pour cela, il nous faut une chose : une table permettant de connaître le nouveau nom. Dans l'exemple suivant, c'est ce que nous obtenons dans la variable `nameMap`.

```typescript
// When importing a CSS module, we get an object
// allowing us to known the final name of our class.
import nameMap from "./mystyle.module.css";

import {useCssModule} from "jopi-rewrite/ui";  
  
export default function() {  
    // Allow embedding the CSS rules into the HTML.
    useCssModule(nameMap);  
    
    // Here nameMap.myButton returns the translated name.
    // Same for nameMap.myText.
    return <>  
        <div className={nameMap.myButton}>  
            <div className={nameMap.myText}>Test CSS Module</div>  
        </div>    
	</>;
}
```