import React from "react";
import { PageContext } from "jopi-rewrite/ui";
import * as ReactServer from "react-dom/server";
export default function (_a) {
    var children = _a.children, controller = _a.controller;
    var body = ReactServer.renderToStaticMarkup(<PageContext.Provider value={controller}>
            {children}
        </PageContext.Provider>);
    var state = controller.getOptions();
    return <html {...state.htmlProps}>
        <head {...state.headProps}>
            {state.head}
            <title>{state.pageTitle}</title>
        </head>
        <body {...state.bodyProps}>
            {state.bodyBegin}
            <div dangerouslySetInnerHTML={{ __html: body }}/>
            {state.bodyEnd}
        </body>
    </html>;
}
