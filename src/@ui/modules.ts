// noinspection JSUnusedGlobalSymbols

import * as ns_events from "jopi-node-space/ns_events";
import {getDefaultMenuManager, MenuManager} from "./menuManager.ts";
import {isServerSide} from "./shared.ts";
import {decodeUserInfosFromCookie, type UiUserInfos} from "./users.ts";
import React from "react";
import {gComponentAlias} from "./internal.ts";

export interface ModuleInitContext_Host {
    getMenuManager(): MenuManager;
    getUserInfos(): UiUserInfos|undefined;
    setComponentAlias(alias: ComponentAliasDef): void;
    getComponentAlias(alias: string): ComponentAliasDef|undefined;

    events: ns_events.EventGroup;
}

export interface ComponentAliasDef {
    alias: string;
    component: React.ComponentType<any>;
}

type UiInitializer = () => void;

/**
 * This class is what is sent as the default export function
 * of your module `uiInit.tsx`. It allows configuring things
 * allowing your plugin to initialize your UI.
 * 
 * * On server side, it's executed for each page.
 * * On browser side, it's executed for each browser refresh.
 */
export class ModuleInitContext_UI {
    constructor(protected readonly host?: ModuleInitContext_Host) {
    }

    getMenuManager() {
        if (this.host) return this.host.getMenuManager();
        return getDefaultMenuManager();
    }

    addUiInitializer(priority: UiInitializer|ns_events.EventPriority, initializer?: UiInitializer|undefined) {
        this.events.addListener("app.init.ui", priority, initializer);
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

    get events(): ns_events.EventGroup {
        if (this.host) return this.host.events;
        return ns_events.defaultEventGroup;
    }
}