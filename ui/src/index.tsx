import React from "react";
import "jopi-node-space";

const nWhat = NodeSpace.what;

export function isServerSide(): boolean {
    return nWhat.isServerSide;
}

export function isBrowserSide(): boolean {
    return nWhat.isBrowser;
}

const CssModule: React.FC<{module: any}> = ({module}) => {
    return <style>{module.__CSS__}</style>;
};

export class PageController<T> {
    readonly data: T = {} as unknown as T;

    pageTitle?: string;

    readonly head: React.ReactNode[] = [];

    readonly htmlProps: Record<string, any> = {};
    readonly bodyProps: Record<string, any> = {};
    readonly headProps: Record<string, any> = {};

    constructor(public readonly isDetached = false) {
    }
}

// Use undefined, otherwise the value is commun for all requests when doing SSR.
const PageContext = React.createContext<PageController<unknown>|undefined>(undefined);

export function usePage<T>(): PageController<T> {
    let res = React.useContext(PageContext) as PageController<T>;

    // Not wrapped inside a PageContext?
    if (!res) res = new PageController<T>(true);

    return res;
}

export const Page: React.FC<{children: React.ReactNode|React.ReactNode[]}> = ({children}) => {
    const controller = new PageController<unknown>();

    return <PageContext.Provider value={controller}>
        <html {...controller.htmlProps}>
        <head {...controller.headProps}>{controller.head}<title>{controller.pageTitle}</title></head>
        <body {...controller.bodyProps}>{children}</body>
        </html>
    </PageContext.Provider>;
}

interface UseCssModuleContextProps {
    jopiUseCssModule?: Record<string, any>;
}

export function useCssModule(cssModule: undefined | Record<string, string>): undefined|React.ReactElement {
    if (!cssModule) return undefined;

    if (nWhat.isServerSide) {
        if (typeof(cssModule)==="object") {
            const ctx = usePage<UseCssModuleContextProps>();
            if (!ctx.data.jopiUseCssModule) ctx.data.jopiUseCssModule = {};

            const fileHash = cssModule.__FILE_HASH__;

            if (fileHash && !ctx.data.jopiUseCssModule[fileHash]) {
                ctx.data.jopiUseCssModule![fileHash] = true;

                if (ctx.isDetached) {
                    // The component is not wrapped inside a Page.
                    // Here the style is directly emitted and not added to the header.
                    //
                    return <CssModule key={fileHash} module={cssModule} />
                }
                else {
                    // Will allow adding the style to the Header.
                    ctx.head.push(<CssModule key={fileHash} module={cssModule} />);
                }
            }
        }
    }

    return undefined;
}

export type OnNewHydrateListener = (importMeta: any, f: React.FunctionComponent, isSpan: boolean, cssModule?: Record<string, string>) => React.FunctionComponent;

export function setNewHydrateListener(listener: OnNewHydrateListener) {
    gListener = listener;
}

export function mustHydrate<T>(importMeta: any, f: React.FunctionComponent<T>, cssModule?: Record<string, string>): React.FunctionComponent<T> {
    return gListener(importMeta, f as React.FunctionComponent, false, cssModule) as  React.FunctionComponent<T>;
}

export function mustHydrateSpan<T>(f: React.FunctionComponent<T>, importMeta: any): React.FunctionComponent<T> {
    return gListener(importMeta, f as React.FunctionComponent, true) as  React.FunctionComponent<T>;
}

function onNewHydrate(_importMeta: any, F: React.FunctionComponent, _isSpan: boolean): React.FunctionComponent {
    return F;
}

let gListener: OnNewHydrateListener = onNewHydrate;