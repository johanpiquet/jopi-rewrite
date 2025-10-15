// noinspection JSUnusedGlobalSymbols

import React, {useState} from "react";
import {type ServerRequestInstance} from "./hooks.tsx";
import {decodeJwtToken, decodeUserInfosFromCookie, isUserInfoCookieUpdated, deleteCookie, type UiUserInfos} from "./shared.ts";
import * as ns_events from "jopi-node-space/ns_events";
import type {ComponentAliasDef, ModuleInitContext_Host} from "./modules.ts";
import {gComponentAlias} from "./internal.ts";
import {isServerSide} from "jopi-node-space/ns_what";
import {getDefaultObjectRegistry, type IsObjectRegistry, ObjectRegistry} from "./objectRegistry.ts";

export interface PageOptions {
    pageTitle?: string;
    head?: React.ReactNode[];
    bodyBegin?: React.ReactNode[];
    bodyEnd?: React.ReactNode[];

    htmlProps?: Record<string, any>;
    bodyProps?: Record<string, any>;
    headProps?: Record<string, any>;
}

export class PageController<T = any> implements ModuleInitContext_Host {
    private readonly isServerSide: boolean = isServerSide;
    private readonly usedKeys = new Set<String>();
    protected state: PageOptions;
    protected serverRequest?: ServerRequestInstance;
    protected userInfos?: UiUserInfos;
    private readonly componentAlias: Record<string, ComponentAliasDef> = {};

    public readonly events = isServerSide ? ns_events.newEventGroup() : ns_events.defaultEventGroup;
    public readonly objectRegistry: IsObjectRegistry = isServerSide ? new ObjectRegistry() : getDefaultObjectRegistry();

    constructor(public readonly isDetached = false, options?: PageOptions) {
        options = options || {};

        this.state = {...options};
    }

    data: T = {} as unknown as T;

    protected pageTitle?: string;

    private checkKey(key: string) {
        if (this.usedKeys.has(key)) {
            return false;
        }

        this.usedKeys.add(key);
        return true;
    }

    public setComponentAlias(aliasDef: ComponentAliasDef) {
        if (isServerSide) {
            this.componentAlias[aliasDef.alias] = aliasDef;
        } else {
            gComponentAlias[aliasDef.alias] = aliasDef;
        }
    }

    public getComponentAlias(name: string): ComponentAliasDef|undefined {
        if (isServerSide) {
            return this.componentAlias[name];
        } else {
            return gComponentAlias[name];
        }
    }

    /**
     * Return the current page url.
     * For server-side: correspond to the url of the request.
     * For browser-side: is the navigateur url.
     */
    public getCurrentURL(): URL {
        if (this.serverRequest) {
            return this.serverRequest.urlInfos;
        }

        return new URL(window.location.href);
    }

    public getUserInfos(): UiUserInfos|undefined {
        if (isServerSide) return this.userInfos;

        if (!this.userInfos) {
            this.userInfos = decodeUserInfosFromCookie();
        }

        return this.userInfos;
    }

    public refreshUserInfos() {
        if (!isServerSide && isUserInfoCookieUpdated()) {
            this.userInfos = decodeUserInfosFromCookie();
            ns_events.sendEvent("user.infosUpdated")
        }
    }

    public logOutUser() {
        if (!isServerSide) {
            deleteCookie("authorization");
        }

        this.refreshUserInfos();
    }

    public addToHeader(key: string, entry: React.ReactNode) {
        if (this.isServerSide) {
            if (!this.checkKey("h" + key)) return this;
            if (!this.state.head) this.state.head = [entry];
            else this.state.head.push(entry);
        } else {
            // No browser-side support.
            // Why? Because React router only replaces the body.
        }

        return this;
    }

    public addStyleLinkToHeader(key: string, url: string) {
        return this.addToHeader(key, <link key={key} rel="stylesheet" href={url}/>);
    }

    public addToBodyBegin(key: string, entry: React.ReactNode) {
        if (!this.checkKey("b" + key)) return this;

        if (!this.state.bodyBegin) this.state.bodyBegin = [entry];
        else this.state.bodyBegin.push(entry);

        // Required to trigger a browser-side refresh of the body.
        this.onStateUpdated(this.state);
        return this;
    }

    public addToBodyEnd(key: string, entry: React.ReactNode) {
        if (!this.checkKey("e" + key)) return this;

        if (!this.state.bodyEnd) this.state.bodyEnd = [entry];
        else this.state.bodyEnd.push(entry);

        // Required to trigger a browser-side refresh of the body.
        this.onStateUpdated(this.state);
        return this;
    }

    public setHeadTagProps(key: string, value: any) {
        if (this.isServerSide) {
            if (!this.state.headProps) this.state.headProps = {};
            this.state.headProps[key] = value;
        }

        return this;
    }

    public setHtmlTagProps(key: string, value: any) {
        if (this.isServerSide) {
            if (!this.state.htmlProps) this.state.htmlProps = {};
            this.state.htmlProps[key] = value;
        }

        return this;
    }

    public setBodyTagProps(key: string, value: any) {
        if (this.isServerSide) {
            if (!this.state.bodyProps) this.state.bodyProps = {};
            this.state.bodyProps[key] = value;
        }

        return this;
    }

    public setPageTitle(title: string) {
        if (this.isServerSide) {
            this.pageTitle = title;
        } else {
            document.title = title;
        }

        return this;
    }

    onStateUpdated(_state: PageOptions) {
        // Will be dynamically replaced.
    }

    onRequireRefresh() {
        // Will be dynamically replaced.
    }
}

export class PageController_ExposePrivate<T = any> extends PageController<T> {
    exportState(): PageOptions {
        return this.state;
    }

    public readonly objectRegistry = new ObjectRegistry();

    setServerRequest(serverRequest: ServerRequestInstance) {
        this.objectRegistry.registerObject("jopi.serverRequest", serverRequest);

        this.serverRequest = serverRequest;
        this.userInfos = decodeJwtToken(serverRequest.getJwtToken());
    }

    getServerRequest(): ServerRequestInstance {
        return this.serverRequest!;
    }
}

export type PageHook = (controller: PageController_ExposePrivate<unknown>) => void;

type PageRenderer = (children: React.ReactNode|React.ReactNode[], hook?: PageHook, options?: PageOptions) => React.ReactNode;

export function setPageRenderer(value: PageRenderer) {
    gPageRender = value;
}

export function renderPage(children: React.ReactNode|React.ReactNode[], hook?: PageHook, options?: PageOptions) {
    if (gPageRender) return gPageRender(children, hook, options);
    return <Page children={children} hook={hook} options={options} />
}

export const Page: React.FC<{
    children: React.ReactNode|React.ReactNode[],
    controller?: PageController_ExposePrivate<unknown>,
    hook?: PageHook,
    options?: PageOptions}> = ({children, hook, options, controller}) => {
    if (!controller) {
        controller = new PageController_ExposePrivate<unknown>(false, options);
        if (hook) hook(controller);
    }

    // On the server side we do a full render.
    // On the browser side, we can't only render the body content
    //      since React doesn't allow a full page replace.
    //
    if (isServerSide) {
        const state = controller.exportState();

        return <PageContext.Provider value={controller}>
            <html {...state.htmlProps}>
            <head {...state.headProps}>
                {state.head}
                <title>{state.pageTitle}</title>
            </head>
            <body {...state.bodyProps}>
            {state.bodyBegin}
            {children}
            {state.bodyEnd}
            </body>
            </html>
        </PageContext.Provider>;
    } else {
        // Using PageContent allows refreshing the body without losing the context.
        function PageContent({children}: {children: React.ReactNode|React.ReactNode[]}) {
            const [state, setState] = useState<PageOptions>(controller!.exportState());
            const [_, setCounter] = useState(0);

            controller!.onStateUpdated = (s) => setState({...s});
            controller!.onRequireRefresh = () => setCounter(prev => prev + 1);

            return <>
                {state.bodyBegin}
                {children}
                {state.bodyEnd}
            </>
        }

        return <PageContext.Provider value={controller}>
            <PageContent>{children}</PageContent>
        </PageContext.Provider>;
    }
}

// Use undefined, otherwise the value is common for all requests when doing SSR.
export const PageContext = React.createContext<PageController<unknown>|undefined>(undefined);

let gPageRender: PageRenderer|undefined;
