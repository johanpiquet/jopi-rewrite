# Authentifier un utilisateur

Jopi gère automatiquement tout un ensemble de choses. Cependant il vous faudra ajouter vous-même un écran et connexion et un point de terminaison pour vérifier le login / mot de passe.

L'exemple suivant montre comment authentifier l'utilisateur côté serveur. Elle est appelé lorsque l'utilisateur saisi son login / mot de passe depuis un formulaire de connexion (champs texte login et password). 

**Exemple de traitement du login/password**
```typescript
import {JopiRequest, type LoginPassword} from "jopi-rewrite";  
  
export default async function(req: JopiRequest) {  
    const data = await req.getBodyData();  
    const authResult = await req.tryAuthWithJWT(data as LoginPassword);  
  
    if (!authResult.isOk) console.log("Auth failed");  
  
    // Will automatically set a cookie containing information.  
    // It why we don't return these information here.    
    return req.jsonResponse({isOk: authResult.isOk});  
}
```

Quand l'authentification a réussi, Jopi enrichit automatiquement la réponse avec un cookie contenant le token JWT. 

Si votre application est de type SPA (Single Page Application) il faudra que le code côté navigateur utilise le hook `useUserStateRefresh` afin de prévenir le système que le cookie d'authentification a changé et qu'il doit mettre à jour son état interne.

**Exemple côté React***
```typescript
// Here we are inside a React component.

// Calling declareUserStateChange allows refreshing the auth state.
const declareUserStateChange = useUserStateRefresh();  
  
// useFormSubmit is a form helper function.
const [submitForm, _] = useFormSubmit((res) => {  
	// Auth success?
    if (res.isOk) { 
	    // Then update the state. 
        declareUserStateChange();
    }  
});
```
