import React from "react";
import {_setCompositeRenderer} from "jopi-rewrite/ui";
import {getUiCompositeItems} from "./modulesManager.js";

_setCompositeRenderer((name) => {
    return <div composite-name={name}>
        {
            getUiCompositeItems(name).map((e, i) => {
                const C = e.Component;
                return <C key={i}/>;
            })
        }
    </div>
});