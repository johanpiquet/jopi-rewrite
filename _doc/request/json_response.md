# Créer une réponse JSON

Jopi expose la fonction `jsonResponse` afin de vous aider à renvoyer facilement une réponse JSON.

**File onPOST.ts**
```typescript
import {JopiRequest, type LoginPassword} from "jopi-rewrite";  
  
export default async function(req: JopiRequest) {  
	const myJson = {isOk: true};
	
	// Is equivalent to:
	// return new Response(JSON.stringify(myJson), {  
	//    status: 200,
	//    headers: {"content-type": "application/json;charset=utf-8"}  
    // });
	//
	req.jsonResponse(myJson);  
}
```

La fonction `jsonStringResponse` est similaire, mais reçoit un JSON déjà encodé sous forme d'une chaîne de caractère.

**File onPOST.ts**
```typescript
import {JopiRequest, type LoginPassword} from "jopi-rewrite";  
  
export default async function(req: JopiRequest) {  
	const myJsonString = readTextFile("./data.json");
	
	// Is equivalent to:
	// return new Response(myJsonString, {  
	//    status: 200,
	//    headers: {"content-type": "application/json;charset=utf-8"}  
    // });
	//
	req.jsonStringResponse(myJsonString);  
}
```

> En complément, la fonction `req.returnResultMessage` peut être utile pour renvoyer une réponse json de type `{isOk: true, message: myValue}`.