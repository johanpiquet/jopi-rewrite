import React from "react";
import {createServer} from "./createServer";

// Must be keep after a call to jopi-rewrite for correct initialization order.
import ComponentA from "./myHydrateComp/ComponentA";
import ComponentB from "./myHydrateComp/ComponentB";

await createServer(async req => {
    let res = await req.fetchServer();

    res = await req.hookIfHtml(res, text => {
        const $ = req.asJquery(text);

        const $found = $(".label-wrapper.mfn-menu-label-wrapper > .menu-label");
        //
        let $first = $($found[0]);
        let $second = $($found[1]);

        $first.reactReplaceContentWith(<ComponentA name="jquery" />);
        $second.reactReplaceContentWith(<ComponentB name="yes !" />);

        return $.html();
    });

    return res;
});