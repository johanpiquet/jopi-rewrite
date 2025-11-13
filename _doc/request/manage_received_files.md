# Gérer les fichiers reçus

La fonction `req.getBodyData` permet de décoder les données reçu, avec l'avantage de traiter automatiquement le cas de formulaire multi-part transmettant des fichiers. Le client émet ces fichiers depuis un objet FormData, ou un formulaire HTML.

**File onPOST.ts**
```typescript
import {JopiRequest} from "jopi-rewrite";  
  
export default async function(req: JopiRequest) {  
    const data = await req.getBodyData<FormValues>();  
  
    console.log("Server received:", data);  
  
    let photo = data.photo;  
    //  
    if (photo instanceof File) {  
        console.log("My file:", await photo.bytes());  
    }  

    return req.returnResultMessage(true);  
}
```

