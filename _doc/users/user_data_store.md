# Define a user store

A user store contains account records and roles.

Options:
- Simple JSON file for prototypes.
- Database (Postgres, MySQL, SQLite) for production.
- External identity provider (Auth0, Keycloak) for managed authentication.

Data to store:
- Unique user identifier, username/email, hashed password, roles, profile data.
- Use a secure password hash (bcrypt, argon2).

Best practices:
- Never store plaintext passwords.
- Keep role assignments explicit and auditable.

# Create a user bank

Jopi provides a basic mechanism to manage an application's users:

* Authentication management, verifying a login/password (or a password hash).
* Management of the connection token, using JWT (JSON Web Token).
* Retrieval of user information at the server API level or from React.js code (server and browser).

Here we use JWT for connection tokens. These tokens are sent to the server with requests coming from the browser via a cookie. JWT tokens have two characteristics:

* They encode public information about the user. This can be decoded on the server but also in the browser without an encryption key.
* These tokens include a proof that allows knowing whether the data is authentic and not tampered with, based on a private signing key stored on the server.

Enabling JWT is done from the `src/index.ts` file, as in the following example.

**File src/index.ts**
```typescript
import {jopiApp} from "jopi-rewrite";
import myUsers from "./myUsers.json" with { type: "json" };

jopiApp.startApp(import.meta, jopiEasy => {
    jopiEasy.create_creatWebSiteServer()

        .enable_jwtTokenAuth()
            // WARNING: you must change this key!
            .step_setPrivateKey("my-private-key")

            .step_setUserStore()
                .use_simpleLoginPassword()
                    .addMany(myUsers)
                    .DONE_use_simpleLoginPassword()
                .DONE_setUserStore()
            .DONE_enable_jwtTokenAuth()
    });
```

Here we enabled JWT and defined a user store that we populated from a JSON file.

**File myUsers.json**
```json
[
  {
    "login": "johan@mymail.com",
    "password": "mypassword",
    "userInfos": {
      "id": "johan",
      "fullName": "Johan P",
      "email": "johan@mymail.com",
      "roles": ["admin", "writer"]
    }
  }
]
```

In this example, the `login` and `password` fields are used to authenticate the user, while `userInfos` contains information about the user.
