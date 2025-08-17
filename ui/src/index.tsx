import React from "react";
import "jopi-node-space";

const nWhat = NodeSpace.what;

export function isServerSide(): boolean {
    return nWhat.isServerSide;
}

export function isBrowserSide(): boolean {
    return nWhat.isBrowser;
}

export type OnNewHydrateListener = (importMeta: any, f: React.FunctionComponent, isSpan: boolean) => React.FunctionComponent;

export function setNewHydrateListener(listener: OnNewHydrateListener) {
    gListener = listener;
}

export function mustHydrate<T>(importMeta: any, f: React.FunctionComponent<T>): React.FunctionComponent<T> {
    return gListener(importMeta, f as React.FunctionComponent, false) as  React.FunctionComponent<T>;
}

export function mustHydrateSpan<T>(f: React.FunctionComponent<T>, importMeta: any): React.FunctionComponent<T> {
    return gListener(importMeta, f as React.FunctionComponent, true) as  React.FunctionComponent<T>;
}

function onNewHydrate(_importMeta: any, F: React.FunctionComponent, _isSpan: boolean): React.FunctionComponent {
    return F;
}

let gListener: OnNewHydrateListener = onNewHydrate;