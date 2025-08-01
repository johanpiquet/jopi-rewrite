import React from "react";
import {mustHydrate, isServerSide} from "_packages/jopi-rewrite-ui";

// CSS with Sass are natively supported.
import "./MyReactJsButton.scss"

// Our React.js component.
const Component = function(p: {serverSideTitle: string, browserSideTitle: string, onClickMessage: string}) {
    // Allow seeing the difference between server and browser.
    const text = isServerSide() ? p.serverSideTitle : p.browserSideTitle;

    return <div className="MyReactJsButton" onClick={()=>alert(p.onClickMessage)}>{text}</div>;
};

// Allow the magic comes from mustHydrate.
// It creates an island inside the server side rendered HTML
// where the HTML output of our React component is automatically
// replaced by the full functional React component.
//
export default mustHydrate(import.meta, Component);