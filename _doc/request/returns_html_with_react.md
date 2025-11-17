# Renvoyer du HTML avec React

Jopi permet de facilement transformer un composant React en du HTML, cela à travers deux mécanismes :

* Les pages React (voir fichiers `page.tsx` du routeur).
* La fonction req.reactResponse, qui se contente de convertir un composant React en du code HTML "mort", qui ne réagit pas aux événements.

**Sample file onGET.tsx**
```typescript tsx
import {JopiRequest} from "jopi-rewrite";  
  
function MyComponent() {  
    const onClick = () => alert("don't works");  
    return <div id="mybutton" onClick={onClick}>MyComponent</div>;  
}  

export default async function(req: JopiRequest) {  
    // Will return: <div id="mybutton">MyComponent</div>
    return req.reactResponse(<MyComponent />);
}
```

La fonction `req.reactResponse` a son intérêt lorsque couplé avec quelque chose comme du JQuery, cependant de façon général c'est un intérêt limité.

La fonction `req.reactToString` est similaire, cependant elle se contente de transformer le React.js en une chaîne de caractères.