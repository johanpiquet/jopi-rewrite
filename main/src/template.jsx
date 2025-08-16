// noinspection ES6UnusedImports
import { lazy } from 'react';
import React from "react";
import ReactDOM from 'react-dom/client';

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

function process() {
    const components = getJopiHydrateItems();

    for (const c of components) {
        const id = c.data.id;
        const ReactComponent = jopiHydrate.components[id];

        ReactDOM.createRoot(c.node).render(<ReactComponent {...c.data.args} />);
    }
}

// Allow all init are ok.
setTimeout(process, 10);