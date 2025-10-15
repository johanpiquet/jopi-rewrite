import * as ns_events from "jopi-node-space/ns_events";
import {getDefaultMenuManager, MenuManager} from "./menuManager.ts";
import {isServerSide} from "./shared.ts";
import {decodeUserInfosFromCookie, type UiUserInfos} from "./users.ts";
import React from "react";
import {gComponentAlias} from "./internal.ts";

interface ModuleInitContext_Host {
    getMenuManager(): MenuManager;
    getUserInfos(): UiUserInfos|undefined;
    setComponentAlias(alias: ComponentAliasDef): void;
    getComponentAlias(alias: string): ComponentAliasDef|undefined;

    addEventListener(eventName: string, priority: ns_events.EventPriority, listener: ns_events.EventListener<unknown>): void;
    sendEvent(eventName: string, value?: any): void;
}

export interface ComponentAliasDef {
    alias: string;
    component: React.ComponentType<any>;
}

/**
 * This class is what is sent as the default export function
 * of your module `uiInit.tsx`. It allows configuring things
 * allowing your plugin to initialize your UI.
 * 
 * * On server side, it's executed for each page.
 * * On browser side, it's executed for each browser refresh.
 */
export class ModuleInitContext_UI {
    constructor(protected readonly host?: ModuleInitContext_Host){
    }

    getMenuManager() {
        if (this.host) return this.host.getMenuManager();
        return getDefaultMenuManager();
    }

    addUiInitializer(priority: ns_events.EventPriority, initializer: ()=>void) {
        if (this.host) {
            this.host.addEventListener("app.init.ui", priority, initializer);
        } else {
            ns_events.addListener("app.init.ui", priority, initializer);
        }
    }

    getUserInfos(): UiUserInfos|undefined {
        if (this.host) return this.host.getUserInfos();
        return decodeUserInfosFromCookie();
    }

    userHasRoles(roles: string[]): boolean {
        if (roles.length === 0) return true;

        let userInfos = this.getUserInfos();
        if (!userInfos) return false;

        let userRoles = userInfos.roles;
        if (!userRoles) return false;

        return !!roles.every(role => userRoles.includes(role));
    }

    ifUserHasRoles(roles: string[], f: () => void): void {
        if (this.userHasRoles(roles)) {
            f();
        }
    }

    ifUserLoggedIn(f: () => Promise<void>) {
        if (isServerSide()) return Promise.resolve();

        // On the browser-side, using it outside a React function is safe.
        let userInfos = this.getUserInfos();
        if (!userInfos) return Promise.resolve();

        let userRoles = userInfos.roles;
        if (!userRoles) return Promise.resolve();
        return f();
    }

    ifNotUserLoggedIn(f: () => Promise<void>) {
        if (isServerSide()) return Promise.resolve();

        // On the browser-side, using it outside a React function is safe.
        let userInfos = this.getUserInfos();
        if (!userInfos) return Promise.resolve();

        let userRoles = userInfos.roles;
        if (userRoles) return Promise.resolve();
        return f();
    }

    setComponentAlias(aliasDef: ComponentAliasDef) {
        if (this.host) this.host.setComponentAlias(aliasDef);
        else gComponentAlias[aliasDef.alias] = aliasDef;
    }
}

/**
 * -- Don't use --
 *
 * For internal usage.
 * Extend ModuleInitContext_UI by exposing some internal things.
 */
export class _MICUI_ExposePrivate extends ModuleInitContext_UI {
    onInitializationDone() {
        // Host is server side only.
        if (this.host) {
            this.host.sendEvent("app.init.ui");
        }
    }
}