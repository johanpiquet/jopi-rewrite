// noinspection ES6UnusedImports
import { lazy } from 'react';
import React from "react";
import ReactDOM from 'react-dom/client';
import {createBrowserRouter, RouterProvider} from "react-router";

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
                route.Component = jopiHydrate.components[route.Component];
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

function process() {
    onInit.forEach(e => e());
}

let gHydrateAllHook;
let onInit = [() => hydrateAll()];

//[PLUGINS]

// Allow waiting that all is ok.
setTimeout(process, 10);