# Know the user and their roles

After authentication, retrieve user identity and roles to customize responses.

How to get user info:
- Decode the JWT from the Authorization header or cookie.
- Load additional user details from the user store if needed.

Use cases:
- Personalize pages based on the user.
- Check roles to authorize access to routes or actions.

Performance:
- Cache user lookups when appropriate to avoid repeated DB hits.

## Server-side

The function `req.getUserInfos` allows obtaining basic information about the currently logged-in user. It operates by decoding the JWT token provided by the caller after verifying its authenticity.

**Example onGET.ts**
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

## Client-side (React)

A React component can use the hook `useUserInfos` to obtain a `UiUserInfos` object. This works both in the browser and on the server (React SSR).

```typescript
import {useUserInfos} from "jopi-rewrite/uikit";

export default async function() {
    const user = useUserInfos();

    if (user) {
        return <div>
            <div>Hello {user.name}</div>
            <div>Your roles: {user.roles?.join(", ")}</div>
        </div>;
    }
    else {
        console.log("not connected");
    }
}
```
