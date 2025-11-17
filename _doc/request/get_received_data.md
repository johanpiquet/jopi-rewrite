# Obtenir les donnés d'entrées

Plusieurs fonctions permettent d'obtenir les données envoyées au serveur.

* `req.getBodyData` renvoie les données venant du body. Elle détecte l'encodage de ces données et les décode correctement.
* `req.urlSearchParams` renvoie les informations encodée dans l'url (après le `?`).
* `req.getReqData` renvoie la concaténation de toutes les données. Celles venant de l'url et celles venant du body.

Si vous connaissez avec certitude la source de donnés (url ou body) et son encodage, alors vous pouvez utiliser une méthode plus directe et légèrement plus performante.
* `req.reqBodyAsJson` pour un body au format JSON.
* `req.reqBodyAsFormData`pour un body au format form-data.
* `res.isReqBodyXFormUrlEncoded` pour une url au format x-form.

**Sample onPOST.ts file**
```typescript
import {JopiRequest} from "jopi-rewrite";  
  
export default async function(req: JopiRequest) {  
    const myData = await req.getBodyData();  
    return req.jsonResponse(myData);  
}
```