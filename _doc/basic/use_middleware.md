# Usage de middleware

## Qu'est-ce qu'un middleware?

Un middleware est une fonction qui est appelée avant le traitement normal d'une requête. Par exemple, afin de filtrer l'IP de l'appelant et n'autoriser que certaines IP.

Avec Jopi, vous avez trois façon de définir un middleware :
* Avoir un middleware s'appliquant à l'ensemble des urls.
* Avoir un middleware dont une expression régulière est testée, afin de filtrer les urls auxquelles il s'applique.
* Avoir un middleware associé à une route précise.

## Qu'est-ce qu'un post-middleware?

Un post-middleware est un middleware s'exécutant après le requête:
* Middleware: s'exécute avant le traitement normal de la requête. Il peut bloquer celle-ci.
* Post-middleware: il s'exécute après et il peut modifier la réponse.

## Définition d'un middleware global

Les middlewares globaux sont définit dans le fichier `serverInit.ts` du module. Ce fichier expose une fonction qui sont appelées juste avant que le serveur ne démarre. C'est là où vous pouvez configurer le serveur en ajoutant des fonctionnalités et en modifiant des options.

```typescript
import {JopiEasyWebSite} from "jopi-rewrite";  
import {JopiRequest} from "jopi-rewrite";  
  
async function ipMiddleware(req: JopiRequest) {  
    let ip = req.requestIP?.address;  
    console.log("Caller IP is", ip);  
  
    // null means it will continue to the next middleware.  
    if (ip?.endsWith("127.0.0.1")) return null;  
  
    // Returning a response stops the request processing.  
    return req.returnError401_Unauthorized();  
}  
  
export default async function(webSite: JopiEasyWebSite) {  
    webSite.configure_middlewares()  
        .add_middleware(  
            // Apply to GET call method only  
            // You can also use "*" or undefined       
            // if you want to apply to all methods.
            "GET",  
              
            // Our function.  
            ipMiddleware, {  
                // Only url starting with "/tests/".  
                regExp: /^\/tests\//  
            }  
        );  
}
```

## Définition d'un middleware local

Les middlewares locaux sont définis dans le fichier `config.ts` d'une route.

```typescript
import {JopiRequest, RouteConfig} from "jopi-rewrite";  
  
async function ipMiddleware(req: JopiRequest) {  
    let ip = req.requestIP?.address;  
    console.log("Caller IP is", ip);  
    if (ip==="127.0.0.1") return null;  
    return req.returnError401_Unauthorized();  
}  
  
export default function (config: RouteConfig) {  
    config.onGET.add_middleware(ipMiddleware);  
}
```