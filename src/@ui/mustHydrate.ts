// noinspection JSUnusedGlobalSymbols

import React from "react";

export type HandlerMustHydrate = (importMeta: any, f: React.FunctionComponent, isSpan: boolean, cssModule?: Record<string, string>) => React.FunctionComponent;

export function setHandler_mustHydrate(listener: HandlerMustHydrate) {
    gHandler_hydrateListener = listener;
}

export function mustHydrate<T>(importMeta: any, f: React.FunctionComponent<T>, cssModule?: Record<string, string>): React.FunctionComponent<T> {
    return gHandler_hydrateListener(importMeta, f as React.FunctionComponent, false, cssModule) as  React.FunctionComponent<T>;
}

export function mustHydrateSpan<T>(f: React.FunctionComponent<T>, importMeta: any): React.FunctionComponent<T> {
    return gHandler_hydrateListener(importMeta, f as React.FunctionComponent, true) as  React.FunctionComponent<T>;
}

function onNewHydrate(_importMeta: any, F: React.FunctionComponent, _isSpan: boolean): React.FunctionComponent {
    return F;
}

let gHandler_hydrateListener: HandlerMustHydrate = onNewHydrate;