## What is a JWT token?

When a user logs in to your website with a username/password, you need to do three things:
1. Check this username/password.
2. Give them an authentication code proving they are logged in.
3. From this code, be able to retrieve information about the user.
This information can be their username, email, roles (e.g., admin).

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
http://127.0.0.1/auth?login=usera&password=pwd-usera

```typescript
import {JopiServer, WebSite} from "jopi-rewrite";

const server = new JopiServer();
const myWebSite = server.addWebsite(new WebSite("http://127.0.0.1"));
server.startServer();

// We must set a secret key, which will allow encoding our JWT token.
// (if you change this secret key, then all delivered tokens will expire).
//highlight-next-line
myWebSite.setJwtSecret("my-secret-key");

// Our function checking the user login password.
// It returns information about the user if ok.
//highlight-next-line
myWebSite.setAuthHandler<UserLoginPassword>(loginInfo => {
    const foundUser = userBase[loginInfo.login];

    if (!foundUser) {
        return {isOk: false, errorMessage: "Unknown user"};
    }

    if (loginInfo.password!==foundUser.password) {
        return {isOk: false, errorMessage: "Wrong password"};
    }

    return {isOk: true, userInfos: foundUser.infos};
});

// Our home page returns information about the user.
myWebSite.onGET("/", req => {
    //This will automatically check and decode our JWT token.
    //highlight-next-line
    let infos = req.getUserInfos();

    if (!infos) {
        throw new NotAuthorizedException("You must call /auth page before!");
    }

    return req.jsonResponse(infos);
})

// Check our login password.
// Here it's very simple and very unsecure, but easy to test.
// You can try: http://127.0.0.1/auth?login=usera&password=pwd-usera
//
myWebSite.onGET("/auth", async req => {
    // Will read data from the url.
    const userLoginPassword = await req.getReqData<UserLoginPassword>();

    // Auth the user. Once done the auth token is store in a cookie.
    //highlight-next-line
    const authRes = await req.tryAuthWithJWT(userLoginPassword);

    if (!authRes.isOk) {
        return req.textResponse(authRes.errorMessage||"", 401);
    }

    return req.jsonResponse(authRes.userInfos);
});

// The information we use to authenticate.
interface UserLoginPassword {
    login: string;
    password: string;
}

// Our user BDD.
const userBase: any = {
    "usera": {password: "pwd-usera", infos: {id: "userA", roles: ["admin", "reader", "writer"]}},
    "userb": {password: "pwd-userb", infos: {id: "userB", roles: ["admin", "reader"]}},
    "without-role": {password: "pwd-without-role", infos: {id: "withoutRole"}}
}
```

## JWT token lifetime

By default, the JWT token is stored in a cookie named `authorization`.
This cookie has a lifetime of 7 days.

You can change how it is stored, either to give the cookie a different lifetime, or to not store it in a cookie at all.

> If you do not store it in a cookie, you must send the token via the HTTP header named *Authorization*.

```typescript
import {ONE_DAY} from "jopi-rewrite";

myWebSite.setJwtTokenStore((token, cookieValue, req, res) => {
    // cookieValue value is "jwt " + token.
    req.addCookie(res, "authorization", cookieValue, {maxAge: ONE_DAY * 365});
});
```