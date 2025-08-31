# Using JWT Token

## What is a JWT token?

When a user logs in to your website with a username/password, you need to do three things:
1. Check this username/password.
2. Give him an authentication code proving they are logged in.
3. On the server side, be able to retrieve basic information about this user.

JWT simplifies steps 2 and 3. It creates a string that serves as authentication proof: this is the JWT token. This token is sent back to the client when authentication succeeds. Each time the client calls our server to access protected areas, they must provide this string.

What makes JWT special is that this string contains information about the user:
* The information is public and can be read from the browser.
* But it also contains an encrypted and tamper-proof part, ensuring the JWT token cannot be forged.

These details stored in the JWT token make the server's job much easier, as they allow it to know if the client is authenticated (i.e., has provided a valid username/password) and to obtain information about this client, without having to implement a complex mechanism, while remaining reliable and secure.

## A complete example

Here is a complete example showing:
* How to authenticate a user with a username/password.
* How to retrieve information about the logged-in user.

The following example starts a server exposing two pages:
* The home page `http://127.0.0.1` shows information about the logged-in user.
* The authentication page `http://127.0.0.1/auth` allows a user to log in.

You must start by logging in, which you can do with this request:
`http://127.0.0.1/auth?login=usera&password=pwd-usera`

```typescript
import {jopiApp} from "jopi-rewrite";

jopiApp.startApp(jopiEasy => {
    jopiEasy.new_webSite("http://127.0.0.1")
        .add_jwtTokenAuth()

        .step_setPrivateKey("my-secret-key")

        .step_setUserStore()
            .use_simpleLoginPassword()
                .addOne("usera", "pwd-usera", {id: "userA", roles: ["admin", "reader", "writer"]})
                .addOne("userb", "pwd-userb", {id: "userb", roles: ["admin", "reader"]})
                .addOne("userc", "pwd-userc", {id: "userc"})
                .DONE_use_simpleLoginPassword()
        .stepConfigure()
            // Cookie will be valid for 4 hours.
            // (default is 7 days)
            .set_cookieDuration(4)
            .DONE_stepConfigure()

        .DONE_add_jwtTokenAuth()

        .add_path_GET("/", async req => {
            // Will get our user info or leave and
            // returns a 401 (unauthorized) if the user
            // is not logged in (you can use getUserInfos
            // to avoid this behavior).
            //
            let infos = req.requireUserInfos();

            // Returns the information.
            return req.jsonResponse(infos);
        })

        .add_path_GET("/auth", async req => {
            // Will read data from the url.
            const userLoginPassword = await req.getReqData();

            // Auth the user. Once done, the auth token is stored in a cookie.
            const authRes = await req.tryAuthWithJWT(userLoginPassword);

            if (!authRes.isOk) {
                return req.textResponse(authRes.errorMessage||"", 401);
            }

            // When creating an auth API, you must return a JSON with the token.
            // If it's an auth page, then you have to know that "req.tryAuthWithJWT"
            // automatically adds the JWT token to the "Authentification" cookie.
            //
            return req.jsonResponse(authRes.authToken);
        });
});
```

## JWT token lifetime

By default, the JWT token is stored in a cookie named `authorization`.
This cookie has a lifetime of 7 days.