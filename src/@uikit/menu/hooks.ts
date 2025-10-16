import {MenuManager} from "./core.ts";
import {type MenuItem} from "./interfaces.ts";
import {useEventValue} from "../helpers/hooks.ts";
import {isServerSide} from "jopi-node-space/ns_what";
import {usePage, useEvent} from "jopi-rewrite/ui";
import {useState} from "react";

export function useMenuManager(): MenuManager {
    return usePage().objectRegistry.getObject<MenuManager>("uikit.menuManager")!
}

export function useMatchingMenuItem(): MenuItem|undefined {
    return useMenuManager().getMatchingMenuItem();
}

export function useMenu(name: string): MenuItem[] {
    const menuManager = useMenuManager();

    if (isServerSide) return menuManager.getMenuItems(name);

    // Will refresh one menu change.
    const [_, setCount] = useState(0);
    useEvent(["app.menu.invalided", "app.menu.activeItemChanged"], () => { setCount(count => count + 1) });

    return menuManager.getMenuItems(name);
}