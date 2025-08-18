import React from "react";
import {createServer} from "./createServer.ts";

import ComponentA from "./myHydrateComp/ComponentA.tsx";

await createServer(async req => {
    if (req.urlInfos.pathname==="/favicon.ico") {
        return req.error404Response();
    }

    let cp = <ComponentA name="jopi" />;
    return req.reactResponse(cp);
});