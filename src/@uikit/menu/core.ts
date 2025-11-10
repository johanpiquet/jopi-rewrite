import {HierarchyBuilder} from "./internal.ts";
import * as jk_events from "jopi-toolkit/jk_events";

import {ucFirst} from "../helpers/tools.ts";
import type {MenuItem} from "./interfaces.ts";

type MenuBuilder = (menu: AppMenu) => void;

export class MenuManager {
    private isInvalid = true;
    private allMenus: Record<string, AppMenu> = {};
    private readonly menuBuilders: Record<string, MenuBuilder[]> = {};

    constructor(private readonly forceURL?: URL) {
        let url = (this.forceURL || new URL(window.location.href)).pathname;

        jk_events.addListener("user.infosUpdated", () => {
            this.invalidateMenus(true);
        });

        jk_events.addListener("app.router.locationUpdated", () => {
            this.updateActiveItems();
        });
    }

    private getUrlPathName(): string {
        let url = (this.forceURL || new URL(window.location.href)).pathname;
        if (!url.endsWith("/")) url += "/";
        return url;
    }

    getMenuItems(name: string): MenuItem[] {
        if (this.isInvalid) {
            this.buildAllMenu();
        }

        let menu = this.allMenus[name];

        if (!menu) {
            if (this.menuBuilders[name]) {
                this.buildAllMenu();
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

    private buildAllMenu() {
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

        this.isInvalid = false;

        for (let menuName in this.menuBuilders) {
            let builders = this.menuBuilders[menuName];

            const menu = new AppMenu({key: menuName});
            menu.setNormalizer(menuNormalizer);
            this.allMenus[menuName] = menu;

            for (const builder of builders) {
                builder(menu);
            }

            checkItem(menu.value, []);
        }

        this.updateActiveItems();
    }

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
        if (this.isInvalid) {
            this.buildAllMenu();
        }
        else if (!this.isActiveItemSearched || forceRefresh) {
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
                    jk_events.sendEvent("app.menu.activeItemChanged", {menuName, menuItem: item});
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

        jk_events.sendEvent("app.menu.invalided", this);
    }
}

class AppMenu extends HierarchyBuilder<MenuItem> {
}

function menuNormalizer(item: MenuItem) {
    if (!item.title) {
        if (item.key) {
            item.title = ucFirst(item.key);
        }
    }

    if (item.url && !item.url.endsWith("/")) item.url += "/";
}

let gReactKey = 0;
let gMenuActiveItem: MenuItem|undefined;