import React from "react";
import {mustHydrate} from "_packages/jopi-rewrite-ui";
import "./ComponentB.scss"

export default mustHydrate(import.meta, function({name}: {name: string}) {
    function doClick(e: React.MouseEvent<HTMLDivElement, MouseEvent>) {
        e.preventDefault();
        alert("click !");
    }

    return <div className="ComponentB" onClick={doClick}>
        <div className="welcome">{"Hi " + name}</div>
    </div>;
});