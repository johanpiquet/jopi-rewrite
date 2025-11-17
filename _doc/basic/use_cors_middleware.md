
# Activer la protection CORS

## Qu'est-ce que le CORS ?

Dans un but de protection, lorsque vous accédez à une ressource serveur alors le navigateur vérifie que le site actuel a bien le droit d'accéder au serveur.

Si c'est important, c'est afin de réduire la possibilité qu'un site internet malveillant aille communiquer avec un site sur lequel vous êtes identifié, cela à votre insu.

* Ce ne réduit pas les attaques d'un pirate contre votre serveur.
* Ça réduit les attaques de type usurpation d'identité.

Activer le CORS, est dont une façon de protéger les visiteurs de votre site. C'est pourquoi **CORS est automatiquement activé**.

## Modifier le CORS

Le CORS peut être modifié depuis le fichier de configuration central `src/index.ts.

```typescript
import {jopiApp} from "jopi-rewrite";  
  
jopiApp.startApp(import.meta, jopiEasy => {  
    jopiEasy.create_creatWebSiteServer()
        // Tips: you can also use 'fastConfigure_cors' for a one line configuration.
        
        .configure_cors()  
	        // The current website is always added automatically.
	        // Here it's a second allows website.
            .add_allowedHost("http://mywebsiteB")
            
            // If you want to disable automatic CORS activation.
			.disable_cors()
  
            .DONE_configure_cors();  
    });
```
