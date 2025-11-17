# Limiter l'accès à des rôles

Plusieurs fonctionnalités permettent de modifier les comportements en fonction des rôles.

**Côté React.js**
* Le hook `useUserHasRoles`  renvoie un boolean indiquant si l'utilisateur possède l'ensemble des rôles indiqués en paramètre.
* Le composant `RequireRoles` permet d'entourer un composant qui ne sera affiché que si l'utilisateur possède les rôles indiqués.

**Dans le fichier `uiInit.ts`**
* La fonction `myModule.ifUserHasRoles` permet d'exécuter une fonction si l'utilisateur possède l'ensemble des rôles indiqués.

Dans le traitement d'une requête (GET/POST/...)
* La fonction `req.getUserRoles` permet de connaître les rôles de l'utilisateur en renvoyant un tableau contenant le nom de ses rôles.
* La fonction `req.userHasRoles` renvoie un boolean indiquant si l'utilisateur à l'ensemble des rôles indiqués.
* Emettre une exception `SBPE_NotAuthorizedException`   provoque une réponse 401 (non autorisé).
* La fonction `req.assertUserHasRoles` émet une exception `SBPE_NotAuthorizedException` si l'utilisateur n'a pas l'ensemble des rôles indiqués.
