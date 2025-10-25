// noinspection ES6UnusedImports
import { lazy } from 'react';
import React from "react";
import ReactDOM from 'react-dom/client';
import {ModuleInitContext_UI} from "jopi-rewrite/ui";
import * as jk_events from "jopi-toolkit/jk_events";
//[IMPORT]

const jopiComposites = {};
const jopiHydrate = { components: {} };
//[DECLARE]

function getJopiHydrateItems() {
    const elements = document.querySelectorAll('[jopi-hydrate]');
    const result = [];

    elements.forEach(element => {
        const jsonString = element.getAttribute('jopi-hydrate');
        result.push({node: element, data: JSON.parse(jsonString)});
    });

    return result;
}

function hydrateAll() {
    if (gHydrateAllHook) { gHydrateAllHook(); return; }
    const components = getJopiHydrateItems();

    for (const c of components) {
        const id = c.data.id;
        const ReactComponent = jopiHydrate.components[id];
        ReactDOM.createRoot(c.node).render(<ReactComponent {...c.data.args} />);
    }
}

window["_JOPI_COMPOSITE_RENDERER_"] = function(name) {
    let composite = jopiComposites[name];
    if (!composite) return undefined;
    return <>{composite.map(C => <C/>)}</>;
}

let gHydrateAllHook;

function createModuleInitContext() {
    if (window["_JOPI_CREATE_MODULE_INIT_CONTEXT_"]) {
        return window["_JOPI_CREATE_MODULE_INIT_CONTEXT_"]();
    }

    return new ModuleInitContext_UI();
}

async function mod_onAllModInitialized() {
    hydrateAll();
    await jk_events.sendEvent("app.init.ui");
}

async function process() {
//[ON_INIT]

    await mod_onAllModInitialized();
}

//[PLUGINS]

// Allow waiting that all is ok.
setTimeout(process, 10);