import React from "react";

import MyButton from "./myHydrateComp/CssModuleButton.tsx";
import {JopiServer, WebSite} from "jopi-rewrite";

const server = new JopiServer();
const myWebSite = new WebSite("http://127.0.0.1");

server.addWebsite(myWebSite);
server.startServer();

myWebSite.onGET("/", async req => {
    return req.reactResponse(<MyButton name="jopi" />);
});