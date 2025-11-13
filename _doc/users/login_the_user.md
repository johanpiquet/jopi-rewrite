# Authenticate a user

Jopi uses JWT by default for authentication.

Flow:
1. User submits credentials to a login route.
2. Verify credentials against the user store.
3. On success, issue a JWT token containing user id and roles.
4. Return the token in a secure cookie or in the JSON response.

Security:
- Sign tokens with a strong secret and set appropriate expiration.
- Use HttpOnly and Secure cookies for browser storage when possible.
- Validate tokens on every protected request.

Jopi automatically handles many details. However, you will need to add your own login screen and an endpoint to verify the username/password.

The following example shows how to authenticate the user on the server. It is called when the user enters their username/password from a login form (text fields "login" and "password").

**Example handling login/password**
```typescript
import {JopiRequest, type LoginPassword} from "jopi-rewrite";

export default async function(req: JopiRequest) {
    const data = await req.getBodyData();
    const authResult = await req.tryAuthWithJWT(data as LoginPassword);

    if (!authResult.isOk) console.log("Auth failed");

    // Will automatically set a cookie containing information.
    // That's why we don't return these information here.
    return req.jsonResponse({isOk: authResult.isOk});
}
```

When authentication succeeds, Jopi automatically enriches the response with a cookie containing the JWT token.

If your application is a SPA (Single Page Application), client-side code should use the hook `useUserStateRefresh` to notify the system that the authentication cookie changed and that it should update its internal state.

**Client-side React example**
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
