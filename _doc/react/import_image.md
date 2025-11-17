
# Importer une image

Dans un fichier de route `page.tsx` vous pouvez directement importer une image.

```typescript
import logo from "./bun.png";  
  
console.log(logo);  
  
export default function () {  
    return <img src={logo} alt="" />;  
}
```


Ici la variable `logo` contient soit l'url de l'image, soit un data-url : qui est une chaîne de caractère encodant le binaire de l'image, ce qui permet de l'inclure directement dans le HTML généré, sans dépendance à une fichier externe.

Url ou data-url, le choix est réalisé automatiquement en fonction de la taille de l'image. En dessous de 3Ko l'image est transformée en data-url, sinon vous obtenez juste son url. Le fichier image est alors automatiquement exposé, vous n'avez rien de particulier à faire.

La taille limite (3ko) peut-être configuré via le fichier `package.json`.

**Exemple de configuration dans package.json**
```json
{
	"jopi": {  
	  "inlineMaxSize_ko": 10  
	}
}
```