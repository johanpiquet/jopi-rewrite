
# Utiliser des urls catch-all

Supposons que vous voulez que tout ce qui débute par l'url `http://monsite/blog` affiche le contenu du site `http://localhost:8080`. Pour mettre en place un tel fonctionnement, une des nécessité est de mettre un écouteur pour toutes les urls débutant par `http://monsite/blog`.
Par exemple `/blog/topicA/20251101` et `/blog/author`. 

C'est là où les urls catch-all sont utiles.

Au niveau des fichiers du routeur, le nom de dossier spécial `[...]` permet de définir un écouteur pour toutes les urls.

**Exemple de définition d'un catch-url**
```
@routes/
|- blog/                   < Mapped to url http://mysite/blog
   |-[...]/                < Will catch all url staring by /blog/
     |- onGET.ts           < Define the function to call
```

**Contenu du fichier onGET.ts**
```typescript
import {JopiRequest, ServerFetch} from "jopi-rewrite";  
  
const sf = ServerFetch.useIP("myblog", "127.0.0.1:8080");  
  
export default async function (req: JopiRequest) {  
    return await req.proxyRequestTo(sf);  
}
```