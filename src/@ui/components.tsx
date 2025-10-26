import React from "react";
import {_usePage} from "./hooks.tsx";

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

/**
 * -- Do not use --
 * Allows the server part to hook the composite renderer used.
 */
export function _setCompositeRenderer(r: CompositeRenderer) {
    gCompositeRenderer = r;
}

/**
 * This component allows inserting the value of a 'composite'.
 * A composite is an extension point for your UI, it allows
 * inserting a thing into a region of your UI by extending his
 * content through plugins.
 *
 * Composites are not defined through API!!!
 * When declaring a module, the engine scans your folder uiComposites.
 *
 * Example:
 * `/modules/myModule/uiComposite/page.logInError/extA.extension.tsx`
 * - `page.logInError` is the name of the composite you extend.
 * - `extA` is the name of the extension point (it has no usage).
 *
 * Inside `extA.extension.tsx` the default export is the component to insert.
 */
export function Composite({name}: {name: string}) {
    if (!gCompositeRenderer) gCompositeRenderer = resolveCompositeRenderer();
    return gCompositeRenderer(name);
}

let gCompositeRenderer: CompositeRenderer|undefined;

//endregion

//region ComponentAlias

/**
 * Render a component which real content is defined programmatically.
 * It allows using the plugin system to replace on a component with another one
 * or to define his default implementation. For example, if you want to be able
 * to use a different layout for your page, then using an alias is a good choice.
 * 
 * Defining an alias is done on the `uiInit.tsx file. Example:
 * `modInit.setComponentAlias({alias: "page.layout.admin", component: DefaultPageLayout});`
 */
export function ComponentAlias({name, children}: {name: string, children?: React.ReactNode}) {
    const page = _usePage();
    const alias = page.getComponentAlias(name);

    if (!alias) return <div className="text-red-500">Component alias not found: {name}</div>;
    const C = alias.component;

    return <C>{children}</C>;
}

//endregion
