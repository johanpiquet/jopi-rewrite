# Restrict access by roles

Protect routes by requiring specific roles.

Methods:
- Declare required roles in route config or special `.cond` files (e.g., `pageNeedRole_admin.cond`).
- Use middleware to verify the current user's roles before executing route logic.

Behavior:
- Return 401 (unauthenticated) or 403 (forbidden) when checks fail.
- Provide clear messages or redirections for unauthorized users.

Tips:
- Keep role definitions centralized and document what each role allows.

Several features allow modifying behavior based on roles.

**Client-side React.js**
* The hook `useUserHasRoles` returns a boolean indicating if the user has all the roles passed as parameters.
* The `RequireRoles` component wraps content that should only be displayed if the user has the specified roles.

**In the `uiInit.ts` file**
* The function `myModule.ifUserHasRoles` allows executing a function if the user has all the specified roles.

**During request handling (GET/POST/...)**
* The function `req.getUserRoles` returns an array containing the names of the user's roles.
* The function `req.userHasRoles` returns a boolean indicating if the user has all the specified roles.
* Throwing an `SBPE_NotAuthorizedException` results in a 401 (not authorized) response.
* The function `req.assertUserHasRoles` throws an `SBPE_NotAuthorizedException` if the user does not have all the specified roles.
