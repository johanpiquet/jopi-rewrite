import {HierarchyBuilder, ucFirst} from "./internal.ts";
import * as ns_events from "jopi-node-space/ns_events";
import React from "react";
import {useEventValue} from "./otherHooks.tsx";
import {isServerSide} from "jopi-node-space/ns_what";
import {usePage} from "jopi-rewrite/ui";

type MenuBuilder = (menu: AppMenu) => void;

export enum MenuName {
    LEFT_MENU = "layout.left",
    RIGHT_MENU = "layout.right",
    TOP_MENU = "layout.top"
}

export class MenuManager {
    private isInvalid = true;
    private allMenus: Record<string, AppMenu> = {};
    private readonly menuBuilders: Record<string, MenuBuilder[]> = {};

    constructor(private readonly forceURL?: URL) {
        ns_events.addListener("user.infosUpdated", () => {
            this.invalidateMenus(true);
        });

        ns_events.addListener("app.router.locationUpdated", () => {
            this.updateActiveItems();
        })
    }

    private getUrlPathName(): string {
        const url = this.forceURL || new URL(window.location.href);
        return url.pathname;
    }

    getMenuItems(name: string): MenuItem[] {
        const buildBreadcrumbAndReactKey = (menu: MenuItem) => {
            function checkItem(item: MenuItem, breadcrumb: string[]) {
                if (item.title) {
                    breadcrumb = breadcrumb ? [...breadcrumb, item.title!] : [item.title!];
                }

                if (item.breadcrumb===undefined) {
                    item.breadcrumb = breadcrumb;
                }

                item.reactKey = "R" + (gReactKey++) + "_"

                if (item.items) {
                    for (const child of item.items) {
                        checkItem(child, breadcrumb);
                    }
                }
            }

            checkItem(menu, []);
        };

        const rebuildMenu = (menuName: string): AppMenu => {
            let builders = this.menuBuilders[menuName];

            const menu = new AppMenu({key: menuName});
            menu.setNormalizer(menuNormalizer);
            this.allMenus[menuName] = menu;

            for (const builder of builders) {
                builder(menu);
            }

            buildBreadcrumbAndReactKey(menu.value);

            return menu;
        };

        let menu = this.allMenus[name];

        if (!menu) {
            if (this.menuBuilders[name]) {
                menu = rebuildMenu(name);
            }
        }
        
        if (menu) {
            const items = menu.value.items;
            if (!items) return [];
            return items as MenuItem[];
        }

        return [];
    }

    private isActiveItemSearched = false;

    private updateActiveItems() {
        this.isActiveItemSearched = true;

        //region Reset menu items

        function reset(item: MenuItem) {
            item.isActive = false;

            if (item.items) {
                for (const child of item.items) {
                    reset(child);
                }
            }
        }

        for (let menuName in this.allMenus) {
            // Will force rebuilding.
            const menu = this.getMenuItems(menuName);
            if (menu) menu.forEach(reset);
        }

        //endregion

        for (const menuName in this.allMenus) {
            this.searchMatchingMenuItem(menuName);
        }
    }

    public getMatchingMenuItem(forceRefresh: boolean = false): MenuItem|undefined {
        if (!this.isActiveItemSearched || forceRefresh) {
            this.updateActiveItems();
        }

        return gMenuActiveItem;
    }

    private searchMatchingMenuItem(menuName?: string): MenuItem|undefined {
        function checkItem(item: MenuItem): boolean {
            item.isActive = false;
            let isActive = item.url===pathName;

            if (isActive) {
                matchingMenuItem = item;

                if (gMenuActiveItem!==item) {
                    gMenuActiveItem = item;
                    ns_events.sendEvent("app.menu.activeItemChanged", {menuName, menuItem: item});
                }
            }

            if (item.items) {
                for (const child of item.items) {
                    if (checkItem(child)) {
                        isActive = true;
                        break;
                    }
                }
            }

            item.isActive = isActive;
            return isActive;
        }

        const pathName = this.getUrlPathName();
        let matchingMenuItem: MenuItem|undefined;

        if (menuName) {
            const menu = this.allMenus[menuName];
            if (menu) checkItem(menu.value);
        } else {
            for (const key in this.allMenus) {
                const menu = this.allMenus[key];
                checkItem(menu.value);
            }
        }

        return matchingMenuItem;
    }

    addMenuBuilder(menuName: string, builder: (menu: AppMenu) => void) {
        let builders = this.menuBuilders[menuName];
        if (!builders) this.menuBuilders[menuName] = [builder];
        else builders.push(builder);

        this.invalidateMenus();
    }

    invalidateMenus(force = false) {
        if (this.isInvalid) {
            if (!force) return;
        }

        this.isInvalid = true;
        this.allMenus = {};

        ns_events.sendEvent("app.menu.invalided", this);

        setTimeout(() => {
            // This will rebuild the menus.
            this.updateActiveItems()
        });
    }
}

export interface MenuItem {
    key: string;
    items?: MenuItem[];

    title?: string;
    url?: string;
    icon?: any;
    isActive?: boolean;

    breadcrumb?: string[] | React.FunctionComponent<unknown>;

    /**
     * Is used as a key for React key calculation.
     */
    reactKey?: string;

    [key: string]: any;
}

class AppMenu extends HierarchyBuilder<MenuItem> {
}

function menuNormalizer(item: MenuItem) {
    if (!item.title) {
        if (item.key) {
            item.title = ucFirst(item.key);
        }
    }
}

//region Hooks

export function useMenuManager(): MenuManager {
    return usePage().objectRegistry.getObject<MenuManager>("uikit.menuManager")!
}

export function useMatchingMenuItem(): MenuItem|undefined {
    if (isServerSide) {
        return useMenuManager().getMatchingMenuItem();
    }

    let v = useEventValue("app.menu.activeItemChanged");
    if (!v) return undefined;
    return v.menuItem as MenuItem;
}

//endregion

let gReactKey = 0;
let gMenuActiveItem: MenuItem|undefined;