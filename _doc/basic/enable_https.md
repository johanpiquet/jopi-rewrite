
# Activer le HTTPS

Pour activer le HTTPS, deux choses sont nécessaires:
* Définir une adresse en HTTPS.
* Associer un certificat SSL, afin de permettre le cryptage des communications.

## Définir l'url du site

Avec Jopi, vous avez deux façons de faire pour définir l'url du site internet. Soit en indiquant explicitement l'url, soit en utilisant la variable d'environnement JOPI_WEBSITE_LISTENING_URL (ou JOPI_WEBSITE_URL).

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

## Utiliser un certificat SSL

Jopi propose trois façon de fournir un certificat SSL:
* Implicitement, en déposant votre certificat dans le dossier "./certs" (à côté de package.json).
* En demandant à Jopi de générer un certificat de développement (utilisable en local uniquement).
* En demandant à Jopi d'utiliser LetsEncrypt.

### Utiliser le dossier certs

En supposant que votre si a l'url `https://mysite.com:3000` voici où déposer  le certificat.

```
|- package.json
|- certs/
   |- mysite.com/
	 |- certificate.key
	 |- certificate.crt.key
```

## Utiliser un certificat de développement

```typescript
import {jopiApp} from "jopi-rewrite";  
  
jopiApp.startApp(import.meta, jopiEasy => {  
	jopiEasy.create_creatWebSiteServer()             
	  .add_httpCertificate()
	    .generate_localDevCert()
	    .DONE_add_httpCertificate()
});
```

### Utiliser LetsEncrypt

```typescript
import {jopiApp} from "jopi-rewrite";  
  
jopiApp.startApp(import.meta, jopiEasy => {  
    jopiEasy.create_creatWebSiteServer(`https://mysite.com:3000`)  
        .add_httpCertificate()  
            .generate_letsEncryptCert("myemail@me.com")  
            .force_expireAfter_days(30) // Optional  
            .enable_production(true) // Optional  
            .disable_log() // Optional  
            .DONE_add_httpCertificate();  
});
```
