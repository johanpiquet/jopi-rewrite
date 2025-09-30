import React from "react";
import {setCompositeRenderer} from "jopi-rewrite-ui";
import {getCompositeItems} from "./modulesManager.js";

setCompositeRenderer((name) => {
    return <div composite-name={name}>
        {
            getCompositeItems(name).map((e, i) => {
                const C = e.Component;
                return <C key={i}/>;
            })
        }
    </div>
});