# Traitement des requêtes HTTP

## Obtenir les informations transmises au serveur

L'exemple suivant montre comment obtenir certaines informations de base à propos de la requête entrante.

```typescript
import {JopiRequest} from "jopi-rewrite";

export default async function (req: JopiRequest): Promise<Response> {
    // Return the requested url as a string.
    const url: string = req.url;
    
    // Return the request url as a URL object.
    const urlInfos: URL = req.urlInfos;
    
    // Get the headers sent by the caller.
    const headers: Headers = req.headers;

    const cookieName: string|undefined = req.getCookie("name");

    // Decode the request body and returns the data found.
    // If a file is send, then we get a standard `File` objet.
    const bodyData: Record<string, any|any[]|File|File[]> = await req.getBodyData();

    // Decode the url search params part.
    const searchParam: URLSearchParams = await req.urlInfos.searchParams;

    // Return information about the caller IP.
    const requestIP: ServerSocketAddress = req.requestIP;

    const userInfos = req.getUserInfos();
    
    // ...
}
```

Voici la définition du type `ServerSocketAddress`.

```typescript
export interface ServerSocketAddress {
    /**
     * The IP address of the client.
     */
    address: string;

    /**
     * The IP family ("IPv4" or "IPv6").
     */
    family: "IPv4" | "IPv6";
}
```

## Renvoyer une réponse

L'exemple suivant montre comment créer la réponse renvoyée par notre fonction.

```typescript
import {JopiRequest} from "jopi-rewrite";

export default async function(req: JopiRequest): Promise<Response> {
    // If you want to return a response with HTML content (utf8 encoded).
    const sampleHtmlResponse: Response = req.htmlResponse("my response");

    // If you want to return a response with JSON content.
    const sampleJsonResponse: Response = req.jsonResponse({message: "my response"});

    // If you want to return an error 401 (not authorized)
    const error401Response = req.returnError401_Unauthorized();

    // If you want to return an error 404 (not found)
    const error404Response = req.returnError404_NotFound();

    // If you want to return an error 500 (system error)
    const error500Response = req.returnError500_ServerError();

    // If you want to return an error 400 (bad request)
    const error400Response = req.returnError400_BadRequest();

    // If you want to return a file.
    const fileResponse = req.returnFile("./my/file/path/image.jpg");

    // Allow adding a cookie into the Response object.
    // The adding is automatically done before returning the final response.
    //
    req.addCookie("my_cookie", "myValue");

    // The same, but with a `maxAge` parameter.
    // Here the cookie will be valid for 3600 secondes.
    req.addCookie("my_cookie", "myValue", {maxAge: 3600});
    
    return sampleHtmlResponse;
}

```

## Obtenir des informations sur l'utilisateur

Lorsqu'une requête est reçue, le serveur va rechercher l'existence d'un token d'authentification, depuis lequel il
va retrouver des informations sur l'utilisateur réalisant la requête.

L'exemple suivant montre comment obtenir des informations sur cet utilisateur.

```typescript
import { JopiRequest, UserInfos } from "jopi-rewrite";

export default async function (req: JopiRequest): Promise<Response> {
    // Get information about the user calling our server.
    const userInfos: UserInfos | undefined = req.getUserInfos();
    
    if (userInfos) {
        const userId: string = userInfos.id;
        const userRoles: string[]|undefined = userInfos.roles;
        const userEMail: string|undefined = userInfos.email;
        const userNickName: string|undefined = userInfos.nickName;
        const userAvatarUrl: string|undefined = userInfos.avatarUrl;
        const userFirstName: string|undefined = userInfos.firstName;
        const userLastName: string|undefined = userInfos.lastName;
    }

    if (req.userHasRoles(["admin", "writer"])) {
        console.log("User has 'admin' and 'writer' role");
    }

    // Always return an array, even if the user is not authentified.
    const allUserRoles: string[] = req.getUserRoles();

    // Throw an exception `SBPE_NotAuthorizedException`
    // if the user has not the roles "admin" and "writer".
    //
    // The framework will catch the exception and return an HTTP code 401.
    //
    req.assertUserHasRoles(["admin", "writer"]);
    
    // ...
}

```