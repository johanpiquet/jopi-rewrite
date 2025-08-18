import React from "react";
import {JopiServer, WebSite} from "jopi-rewrite";
import ComponentA from "./myHydrateComp/ComponentA.tsx";

const server = new JopiServer();
const myWebSite = new WebSite("http://127.0.0.1");

server.addWebsite(myWebSite);
server.startServer();

myWebSite.onGET("/", async req => {
    if (req.urlInfos.pathname==="/favicon.ico") {
        return req.error404Response();
    }

    let cp = <ComponentA name="jopi" />;
    return req.reactResponse(cp);
});