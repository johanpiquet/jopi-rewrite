import React from "react";
function defaultCompositeRenderer() {
    return <></>;
}
function resolveCompositeRenderer() {
    var bound = globalThis["_JOPI_COMPOSITE_RENDERER_"];
    if (bound)
        return bound;
    return defaultCompositeRenderer;
}
/**
 * -- Do not use --
 * Allows the server part to hook the composite renderer used.
 */
export function _setCompositeRenderer(r) {
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
export function Composite(_a) {
    var name = _a.name;
    if (!gCompositeRenderer)
        gCompositeRenderer = resolveCompositeRenderer();
    return gCompositeRenderer(name);
}
var gCompositeRenderer;
//endregion
