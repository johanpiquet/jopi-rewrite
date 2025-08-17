import React from "react";
import {mustHydrate, isServerSide} from "jopi-rewrite-ui";
import styles from "./LocalStyleButton.scss";

const Component = function({name}: {name: string}) {
    function doClick(e: React.MouseEvent<HTMLDivElement, MouseEvent>) {
        e.preventDefault();
        alert("click !");
    }

    let text = "Hello " + name;
    if (isServerSide()) text += " (server side)";
    else text += " (browser side)";

    console.log(styles);

    return <div className="myLocalStyle" onClick={doClick}>
        <div className="welcome">{text}</div>
    </div>;
};

export default mustHydrate(import.meta, Component);