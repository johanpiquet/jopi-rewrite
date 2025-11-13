# Créer une banque d'utilisateur

Jopi offre un mécanisme basique permettant de gérer les utilisateurs d'une application :

* Gestion de l'authentification, en vérifiant un login mot de passe (ou un hash du mot de passe).
* Gestion du token de connexion, en utilisant la technologie JWT (Json Web Token).
* Gestion de l'obtention d'informations sur l'utilisateur, au niveau d'une API serveur, ou depuis  le code React.js (serveur et browser).

Ici nous utilisons le format JWT pour les tokens de connexion. Ces tokens sont transmis au serveur en même temps que les appels provenant du navigateur, cela grâce à un cookie. Les tokens JWT ont deux particularités:

* Ils encodent des informations publiques à propos de l'utilisateur. Elles peuvent être décodées côté serveur mais aussi côté navigateur, et cela sans clé de chiffrement.
* Ces tokens intègrent une preuve, qui permet de savoir si ces données sont authentiques et non des données trafiquées. Cela en se basant sur une clé de chiffrement privée, stockée côté serveur.

L'activation de JWT se fait depuis le fichier `src/index.ts`, selon l'exemple suivant.

**Fichier src/index.ts**
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

Ici nous avons activé JWT, et définit un magasin d'utilisateurs que nous avons rempli à l'aide d'un fichier JSON.

**Fichier myUsers.json**
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

Ici les informations `login`et `password`sont celles utilisées pour authentifier l'utilisateur. Tandis que l'information `userInfos` contient des informations sur l'utilisateur.