import React from "react";
import {setCompositeRenderer} from "jopi-rewrite/ui";
import {getUiCompositeItems} from "./modulesManager.js";

setCompositeRenderer((name) => {
    return <div composite-name={name}>
        {
            getUiCompositeItems(name).map((e, i) => {
                const C = e.Component;
                return <C key={i}/>;
            })
        }
    </div>
});