import React from "react";
import {usePage} from "./otherHooks.tsx";

//region Composite

type CompositeRenderer = (name: string) => React.ReactElement;

function defaultCompositeRenderer() {
    return <></>;
}

function resolveCompositeRenderer(): CompositeRenderer {
    let bound = (globalThis as any)["_JOPI_COMPOSITE_RENDERER_"];
    if (bound) return bound as CompositeRenderer;
    return defaultCompositeRenderer;
}

export function setCompositeRenderer(r: CompositeRenderer) {
    gCompositeRenderer = r;
}

export function Composite({name}: {name: string}) {
    if (!gCompositeRenderer) gCompositeRenderer = resolveCompositeRenderer();
    return gCompositeRenderer(name);
}

let gCompositeRenderer: CompositeRenderer|undefined;

//endregion

//region ComponentAlias

export function ComponentAlias({name, children}: {name: string, children?: React.ReactNode}) {
    const page = usePage();
    const alias = page.getComponentAlias(name);

    if (!alias) return <div className="text-red-500">Component alias not found: {name}</div>;
    const C = alias.component;

    return <C>{children}</C>;
}

//endregion

export function AdminPageLayout({children}: {children?: React.ReactNode}) {
    return <ComponentAlias name="page.layout.admin">{children}</ComponentAlias>
}