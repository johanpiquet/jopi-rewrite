import React from "react";
import {createServer} from "./createServer";

// Must be keep after a call to jopi-rewrite for correct initialization order.
import ComponentA from "./myHydrateComp/ComponentA";

await createServer(async req => {
    if (req.urlInfos.pathname==="/favicon.ico") {
        return req.error404Response();
    }

    let cp = <ComponentA name="jopi" />;
    return req.reactResponse(cp);
});