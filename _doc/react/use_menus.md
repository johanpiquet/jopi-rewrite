# Use menus

Jopi provides helpers to define and render navigation menus.

How to define:
- Declare menu items in module configuration or a dedicated menu file.
- Each item typically includes a label, URL and optional roles or visibility rules.

How to render:
- Use provided menu components or render the menu data directly in your layout.

Tips:
- Use role-based visibility to show/hide items for authenticated users.
- Keep menu definitions centralized when possible for easier maintenance.

## Use menus

A website or application very often uses menus. These menus are frequently conditioned by the user's roles: depending on their rights, the menu will show or hide certain entries.

This menu mechanism is already integrated into Jopi to save you time. It allows defining menus, customizing them according to user roles, and obtaining the data that forms these menus.

Menu declarations are done in the `uiInit.tsx` file located at the root of a module. Each module has such a file, which is called when a page is displayed so it can customize its information.

**Example of declaring a menu**
```typescript jsx
import {UiKitModule, MenuName} from "jopi-rewrite/uikit";

export default function(myModule: UiKitModule) {
	// Allow accessing the menus.
    const menuManager = myModule.getMenuManager();

	// Set a function which is called when
	// the menu is requested for the first time.
	//
	// Here the target is the menu shown at the left side
	// of our application / website. The MenuName object
	// is only a helper for common menu names.
	//
    menuManager.addMenuBuilder(MenuName.LEFT_MENU, (leftMenu) => {
		// Here we select the menu "Users" and the sub-menu "List users".
		// They are created if missing.
		//
		leftMenu.selectItem(["Users", "List users"])
					// We set the url called when clicking
					// the menu entry. Other properties
					// can be set, like the menu title
					// and an icon.
					//
		            .value = {url: "/users/list"};

		// ifUserHasRoles calls this function if the
		// user has all the roles (here admin + useradmin).
		//
        myModule.ifUserHasRoles(["admin", "useradmin"], () => {
            leftMenu.selectItem(["Users", "Add user"])
	            .value = {url: "/users/add"};
        });
    });
}
```

The `useMenu` hook lets you obtain the data describing a menu from a React component. The `useMatchingMenuItem` hook returns a reference to the menu item pointing to the current URL — i.e., the one that was just clicked.

**Example of using a menu**
```typescript tsx
import {useMatchingMenuItem, useMenu} from "jopi-rewrite/uikit";

export default function() {
	const items = useMenu(MenuName.LEFT_MENU);
	const current = useMatchingMenuItem();

	return <div>{JSON.stringify(items)}</div>
}
```
