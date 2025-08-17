import React from "react";

// Must be keep after a call to jopi-rewrite for correct initialization order.
import MyButton from "./myHydrateComp/LocalStyleButton.tsx";
import {JopiServer, WebSite} from "jopi-rewrite";

const server = new JopiServer();
const myWebSite = new WebSite("http://127.0.0.1");

server.addWebsite(myWebSite);
server.startServer();

myWebSite.onGET("/", async req => {
    if (req.urlInfos.pathname==="/favicon.ico") {
        return req.error404Response();
    }

    let cp = <MyButton name="jopi" />;
    return req.reactResponse(cp);
});