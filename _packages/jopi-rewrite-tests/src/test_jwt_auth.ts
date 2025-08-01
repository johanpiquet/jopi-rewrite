import {JopiServer, NotAuthorizedException, ONE_DAY, WebSite} from "jopi-rewrite";

const server = new JopiServer();
const myWebSite = server.addWebsite(new WebSite("http://127.0.0.1"));
server.startServer();

// We must set a secret key, which will allows encoding our JWT token.
// (if you change this secret key, then all delivered tokens will expire).
//highlight-next-line
myWebSite.setJwtSecret("my-secret-key");

myWebSite.setJwtTokenStore((token, cookieValue, req, res) => {
    req.addCookie(res, "authorization", cookieValue, {maxAge: ONE_DAY * 365})
});

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

myWebSite.onGET("/check-roles", req => {
    // If the user has not this role, then throw
    // an error NotAuthorizedException, which will
    // return a response with code 401.
    //
    req.assertUserHasRoles("reader");

    if (req.userHasRoles("admin", "writer")) {
        return req.htmlResponse("You are an admin with writer role!");
    }

    if (req.userHasRoles("writer")) {
        return req.htmlResponse("You have writer access!");
    }

    return req.htmlResponse("Your roles:" + JSON.stringify(req.getUserRoles()));
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

    // Auth the user. Once done, the auth token is stored in a cookie.
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