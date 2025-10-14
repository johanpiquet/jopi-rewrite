// noinspection ES6UnusedImports
import { lazy } from 'react';
import React from "react";
import ReactDOM from 'react-dom/client';
import {createBrowserRouter, RouterProvider} from "react-router";
import {ModuleInitContext_UI, Page} from "jopi-rewrite/ui";
import * as ns_events from "jopi-node-space/ns_events";
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

function patchRoutes(routes) {
    function doPatch(routes) {
        for (let route of routes) {
            if (route.Component) {
                const routePath = route.Component;
                const C = jopiHydrate.components[routePath];
                const myKey = routePath;

                route.Component = () => {
                    return <Page key={myKey}><C/></Page>;
                }
            }

            if (route.children) {
                doPatch(route.children);
            }
        }
    }

    doPatch(routes);
    return routes;
}

function hydrateAll() {
    if (gHydrateAllHook) {
        gHydrateAllHook();
        return;
    }

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

    return <>
        {composite.map(C => <C/>)}
    </>;
}

let gHydrateAllHook;

async function mod_initializeMod(exportDefault) {
    try {
        if (exportDefault && typeof exportDefault === "function") {
            let res = exportDefault(new ModuleInitContext_UI());
            if (res instanceof Promise) await res;
        }
    }
    catch (e) {
        console.error(`Error while initializing module`);
        throw e;
    }
}

async function mod_onAllModInitialized() {
    hydrateAll();
    await ns_events.sendEvent("app.init.ui");
}

async function process() {
//[ON_INIT]
}

//[PLUGINS]

// Allow waiting that all is ok.
setTimeout(process, 10);