
# Utiliser les menus

Un site internet, ou une application, utilise très souvent des menus. Ces menus sont souvent conditionné aux rôles de l'utilisateur : en fonction de ses droits, le menu affichera ou cachera certaines entrées.

Ce mécanisme de menus est déjà intégré à Jopi afin de vous faire gagner du temps. Il permet de définir des menues, les personnaliser selon les rôles de l'utilisateur, et d'obtenir les données formant ces menus.

La déclaration des menus se fait dans le fichier `uiInit.tsx` se trouvant à la racine d'un module. Chaque module a un tel fichier, qui est appelé lorsqu'une page est affiché afin de pouvoir personnaliser ses informations.

**Exemple de déclaration d'un menu**
```typescript jsx
import {UiKitModule, MenuName} from "jopi-rewrite/uikit";  
  
export default function(myModule: UiKitModule) {
	// Allow accessing the menus.
    const menuManager = myModule.getMenuManager();  
  
	// Set a function which is called when
	// the menu is asked for the first time.
	//
	// Here the target is the menu shown at the left-side
	// of our application / website. The MenuName objet
	// is only an helper for common menu names.
	//
    menuManager.addMenuBuilder(MenuName.LEFT_MENU, (leftMenu) => {
		// Here we select the menu "Users" and the sub-menu "List users".
		// They are created if missing.
		//
		leftMenu.selectItem(["Users", "List users"])
					// We set the url call when clicking
					// the menu entry. Other properties
					// can be set, like the menu title
					// and an incon.
					//
		            .value = {url: "/users/list"};  
	
		// ifUserHasRoles call his function if the
		// user has all the roles (here admin + useradmin).
		//
        myModule.ifUserHasRoles(["admin", "useradmin"], () => {  
            leftMenu.selectItem(["Users", "Add user"])
	            .value = {url: "/users/add"};  
        });  
    }); 
}
```

Le hook `useMenu` permet d'obtenir les données décrivant un menu, cela depuis un composant React. Le hook `useMatchingMenuItem` permet d'obtenir une référence à l'élément du menu pointant vers l'url actuelle. Donc celui sur lequel nous venons de cliquer.

**Exemple d'usage d'un menu**
```typescript tsx
import {useMatchingMenuItem, useMenu} from "jopi-rewrite/uikit";

export default function() {
	const items = useMenu(MenuName.LEFT_MENU);
	const current = useMatchingMenuItem();
	
	return <div>{JSON.stringify(items)}</div>
}
```
