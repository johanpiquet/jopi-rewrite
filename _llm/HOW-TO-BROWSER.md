# HOW-TO FOR THE BROWSER

* Ce document est un sommaire, permettant de savoir quel fichier lire afin de réaliser une tâche particulière.
* Tu ne dois pas lire l'ensemble des fichiers, mais que ceux qui te semblent utiles pour la tâche qui t'est demandée.
* Les tâches indiquées ici, sont uniquement pour un travail liée à la partie navigateur.
* Pour ce qui est lié à React.js, tu dois te réferer au fichier [HOW-TO-REACT.md](HOW-TO-REACT.md).

--- 

## Rappel à propos du fichier `uiInit.ts`

Le fichier `uiInit.ts` (ou uiInit.tsx) est appelé à chaque fois que le navigateur recharge son contenu.
Son rôle est de configurer la partie navigateur.

## Obtenir des informations de base

L'exemple suivant montre comment obtenir des informations à propos du site.

```typescript
//file src/mod_myModule/uiInit.ts

import { UiKitModule } from "jopi-rewrite/uikit";

export default function(myModule: UiKitModule) {
  // Get the current url.
  // You must absolutely use this method to get the current URL.
  // And NOT directly use `window.location`.
  // Why? Because this makes the code compatible with server-side rendering.
  const currentURL = myModule.getCurrentURL();

  // Is true if we are inside a browser.
  // IS false if the rendering is done on the server-side.
  //
  const isBrowserSide = myModule.isBrowserSide;
}
```

## Définir une fonction d'initialisation

L'exemple suivant montre comment exécuter une fonction lorsque l'ensemble des modules sont initialisés.

```typescript
//file src/mod_myModule/uiInit.ts

import { UiKitModule } from "jopi-rewrite/uikit";
import {EventPriority} from "jopi-toolkit/jk_events";

export default function(myModule: UiKitModule) {
  // Allow executing a function when all the modules are initialized.
  myModule.addUiInitializer(() => {
    console.log("All module are initialized");
  });

  // The same, but with a priority allowing to execute this function before all other ones.
  // The priority are: veryLow, low, default, high, veryHigh.
  //
  myModule.addUiInitializer(EventPriority.veryHigh, () => {
    console.log("All module are initialized");
  });
}
```

## Obtenir des informations sur l'utilisateur

L'exemple suivant montre comment obtenir des informations sur l'utilisateur connecté et ses rôles.
Elle montre aussi comment personnaliser le traitement en fonction de ses rôles.

```typescript
import { UiKitModule } from "jopi-rewrite/uikit";
import {UiUserInfos} from "jopi-rewrite/ui";

export default function(myModule: UiKitModule) {
  // Get information about the current user.
  let userInfos = myModule.getUserInfos();

  if (userInfos) {
    const userId: string = userInfos.id;
    const userRoles: string[]|undefined = userInfos.roles;
    const userEMail: string|undefined = userInfos.email;
    const userNickName: string|undefined = userInfos.nickName;
    const userAvatarUrl: string|undefined = userInfos.avatarUrl;
    const userFirstName: string|undefined = userInfos.firstName;
    const userLastName: string|undefined = userInfos.lastName;
  }

  // Get all the roles of the user.
  // Always returns an array, even if the user is not connected or has no roles.
  const userRoles: string[] = myModule.getUserRoles();

  // Execute a function if the user has all the roles.
  myModule.ifUserHasRoles(["admin", "writer"], (userInfos: UiUserInfos) => {
    console.log("User has 'admin' and 'writer' role");
  });

  myModule.ifUserLoggedIn((userInfos: UiUserInfos) => {
    console.log("The use is logged in");
  });
}
```

