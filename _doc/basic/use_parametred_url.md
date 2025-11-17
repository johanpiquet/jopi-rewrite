# Utiliser des urls paramétrées

## Définir une url paramétrée

Supposons que vous avec les urls suivantes :

* http://monsite/product/productAA
* http://monsite/product/productAB
* ...
* http://monsite/product/productZZ

Ici l'url permet de connaître l'identifiant du produit que nous désirons afficher. Cependant ce que nous aimerions, c'est avoir le même code pour gérer tout ces produits.

C'est là où les urls paramétrées sont indispensables.

Au niveau des fichiers du routeur, l'usage de crochet permet de définir un paramètre d'url. Ce qui est entre les crochet, est le nom du paramètre.

**Exemple de définition du paramètre productId**
```
@routes/
|- product/                < mapped to url http://mysite/product
   |-[productId]/          < url of type http://mysite/product/productAA
     |- page.tsx           < define the visual
```

## Retrouver l'information

### A l'aide d'un hook React

L'exemple suivant montre comment utiliser un hook pour retrouver les paramètres d'url depuis React.js.

```typescript
import {usePageParams} from "jopi-rewrite/uikit";  
  
export default function Product() {  
    const pageParams = usePageParams();  
    return <div>Product is {pageParams.productId}</div>;  
}
```

### Depuis un écouteur de type onPOST.ts

L'exemple suivant permet de retrouver les paramètres d'url depuis un objet JopiRequest, tel que transmis dans les fichier `onPOST.ts`, `onPUT.ts`, ...

```typescript
import {JopiRequest} from "jopi-rewrite";  
  
export default async function(req: JopiRequest) {  
    console.log("ProductId: ", req.urlParts.productId);  
    return req.htmlResponse("");  
}
```