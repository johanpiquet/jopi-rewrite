# Connaître l'utilisateur et ses rôles

## Côté serveur

La fonction `req.getUserInfos` permet d'obtenir des informations de base sur l'utilisateur actuellement connecté. Elle opère en décodant le token JWT reçut par l'appelant, après avoir vérifié son authenticité.

**Exemple onGET.ts***
```typescript
import {JopiRequest} from "jopi-rewrite";  
  
export default async function(req: JopiRequest) {  
    let userInfos = req.getUserInfos();  
  
    if (userInfos) {  
        console.log("User infos:", userInfos);  
    }  
  
    return req.jsonResponse(userInfos);  
}
```

## Coté React

Un composant React peut utiliser le hook `useUserInfos` pour obtenir un objet `UiUserInfos`. Cela que ce soit dans le browser, ou côté serveur (React SSR).

```typescript
import {useUserInfos} from "jopi-rewrite/uikit";  
  
export default async function() {  
    const user = useUserInfos();  
      
    if (user) {  
        return <div>  
            <div>Hello {user.name}</div>  
            <div>You roles: {user.roles?.join(", ")}</div>  
        </div>;  
    }  
    else {  
        console.log("not connected");  
    }  
}
```