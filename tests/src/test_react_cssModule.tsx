import React from "react";

// Must be keep after a call to jopi-rewrite for correct initialization order.
import MyButton from "./myHydrateComp/CssModuleButton.tsx";
import {JopiServer, WebSite} from "jopi-rewrite";
import {Page} from "jopi-rewrite-ui";

const server = new JopiServer();
const myWebSite = new WebSite("http://127.0.0.1");

server.addWebsite(myWebSite);
server.startServer();

myWebSite.onGET("/", async req => {
    if (req.urlInfos.pathname==="/favicon.ico") {
        return req.error404Response();
    }

    let cp = <Page>
        <MyButton name="jopi" />
    </Page>;

    return req.reactResponse(cp);
});