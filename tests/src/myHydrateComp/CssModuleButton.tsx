import React from "react";
import {mustHydrate, isServerSide} from "jopi-rewrite-ui";

// Return the css-module and note the path of the source file.
// With node.js, it requires doing "node --import jopi-loader".
// With bun.js, it requires doing "bun --preload jopi-loader".
//
import styles from "./mybutton.module.scss";

const Component = function({name}: {name: string}) {
    function doClick(e: React.MouseEvent<HTMLDivElement, MouseEvent>) {
        e.preventDefault();
        alert("click !");
    }

    let text = "Hello " + name;
    if (isServerSide()) text += " (server side)";
    else text += " (browser side)";

    return <div className={styles.myLocalStyle} onClick={doClick}>
        <div className="welcome">{text}</div>
    </div>;
};

export default mustHydrate(import.meta, Component);
//export default Component;