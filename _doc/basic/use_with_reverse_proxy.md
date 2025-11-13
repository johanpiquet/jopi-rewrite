# Utiliser un reverse-proxy

Un reverse-proxy est un serveur exposé publiquement sur internet, dont le but est de relier un serveur interne au réseau publique. Il prend chaque requête destinées à ce serveur, les lui envoie, puis il retourne la réponse de ce serveur.

L'usage d'un reverse-proxy nécessite de distinguer deux choses :
- L'url publique du site : ce que les visiteurs saisissent dans leur navigateur.
- L'url technique du serveur : sur laquelle il écoute pour recevoir des messages.

Lorsqu'un serveur est directement exposé sur internet, alors ces deux urls sont les même. Mais lorsque vous utilisez un reverse-proxy, alors elles se mettent à différer. L'url publique pointe sur le reverse-proxy, lequel doit utiliser l'url technique du serveur pour pouvoir discuter avec lui.

Les variables d'environnement JOPI_WEBSITE_URL et permettent de définir ces url JOPI_WEBSITE_LISTENING_URL.

* JOPI_WEBSITE_URL : définit l'url publique du serveur, celle utilisée pour former les urls dans les pages et informations renvoyées par le serveur.
* JOPI_WEBSITE_LISTENING_URL : définit l'url technique du serveur, celle que le reverse-proxy utilise pour joindre notre serveur.

> Si JOPI_WEBSITE_LISTENING_URL n'est pas défini, alors Jopi prendra automatiquement JOPI_WEBSITE_URL

**Exemple for /src/index.ts**
```typescript
import {jopiApp} from "jopi-rewrite";  
  
jopiApp.startApp(import.meta, jopiEasy => { 
	// Here I explicitely set the website url. 
    jopiEasy.create_creatWebSiteServer("https://localhost");
     
    // Here I don't set it.
    // It will use process.env.JOPI_WEBSITE_LISTENING_URL.
    // With a fallback to process.env.JOPI_WEBSITE_URL.
    //
    jopiEasy.create_creatWebSiteServer(); 
});
```
