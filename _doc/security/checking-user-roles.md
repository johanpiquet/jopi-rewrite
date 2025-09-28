## What are roles?

Roles are attributes associated with users, allowing you to define their permissions. If you look at the example about JWT tokens [(here)](_doc/security/using-jwt-token.md), you will see that we have assigned roles to users `usera` and `usera`, while `userc` has no roles.

The functions `req.getUserRoles`, `req.userHasRoles`, and `req.assertUserHasRoles` allow you to check these roles.

```typescript
import {jopiApp} from "jopi-rewrite";

jopiApp.startApp(import.meta, jopiEasy => {
    jopiEasy.new_webSite("http://127.0.0.1")

        .add_path_GET("/", async req => {
            // If the user does not have this role, then throw
            // a NotAuthorizedException error, which will
            // return a response with code 401.
            //
            req.assertUserHasRoles(["reader"]);

            if (req.userHasRoles(["admin", "writer"])) {
                return req.htmlResponse("You are an admin with writer role!");
            }

            if (req.userHasRoles(["writer"])) {
                return req.htmlResponse("You have writer access!");
            }

            return req.htmlResponse("Your roles:" + JSON.stringify(req.getUserRoles()));
        });
});
```