// noinspection JSUnusedGlobalSymbols

import * as ns_events from "jopi-node-space/ns_events";
import {type UiUserInfos} from "./tools.ts";
import React from "react";
import {isServerSide} from "jopi-node-space/ns_what";
import {type IsObjectRegistry} from "./objectRegistry.ts";
import {getDefaultPageController} from "./internal.ts";

export interface ModuleInitContext_Host {
    objectRegistry: IsObjectRegistry;

    getCurrentURL(): URL;
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
    public readonly objectRegistry: IsObjectRegistry;
    public readonly events: ns_events.EventGroup;
    public readonly isBrowserSide: boolean = !isServerSide;
    protected readonly host: ModuleInitContext_Host;

    constructor(host?: ModuleInitContext_Host) {
        if (!host) host = getDefaultPageController();
        this.host = host;

        this.objectRegistry = host.objectRegistry;
        this.events = host.events;

        this.initialize();
    }

    protected initialize() {
        // Will be overridden.
    }

    getCurrentURL(): URL {
        return this.host.getCurrentURL();
    }

    addUiInitializer(priority: UiInitializer|ns_events.EventPriority, initializer?: UiInitializer|undefined) {
        this.events.addListener("app.init.ui", priority, initializer);
    }

    getUserInfos(): UiUserInfos|undefined {
        return this.host.getUserInfos();
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
        // On the browser-side, using it outside a React function is safe.
        let userInfos = this.getUserInfos();
        if (!userInfos) return Promise.resolve();

        let userRoles = userInfos.roles;
        if (!userRoles) return Promise.resolve();
        return f();
    }

    ifNotUserLoggedIn(f: () => Promise<void>) {
        // On the browser-side, using it outside a React function is safe.
        let userInfos = this.getUserInfos();
        if (!userInfos) return Promise.resolve();

        let userRoles = userInfos.roles;
        if (userRoles) return Promise.resolve();
        return f();
    }

    setComponentAlias(aliasDef: ComponentAliasDef) {
        this.host.setComponentAlias(aliasDef);
    }
}