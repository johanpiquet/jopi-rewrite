import React from "react";

const isBunJS = typeof(Bun) !== "undefined";

export function isServerSide(): boolean {
    return isBunJS;
}

export function isBrowserSide(): boolean {
    return !isBunJS;
}

export type OnNewHydrateListener = (importMeta: {filename: string}, f: React.FunctionComponent, isSpan: boolean) => React.FunctionComponent;

export function setNewHydrateListener(listener: OnNewHydrateListener) {
    gListener = listener;
}

export function mustHydrate<T>(importMeta: {filename: string}, f: React.FunctionComponent<T>): React.FunctionComponent<T> {
    return gListener(importMeta, f as React.FunctionComponent, false) as  React.FunctionComponent<T>;
}

export function mustHydrateSpan<T>(f: React.FunctionComponent<T>, importMeta: {filename: string}): React.FunctionComponent<T> {
    return gListener(importMeta, f as React.FunctionComponent, true) as  React.FunctionComponent<T>;
}

function onNewHydrate(_importMeta: {filename: string}, F: React.FunctionComponent, _isSpan: boolean): React.FunctionComponent {
    return F;
}

let gListener: OnNewHydrateListener = onNewHydrate;