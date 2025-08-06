import {type JopiRouteHandler, JopiServer, type PageCache, WebSite} from "jopi-rewrite";

//const url = "https://developer.mozilla.org"; const ip = "34.111.97.67";

export async function createServer(test: JopiRouteHandler, cache?: PageCache) {
    const server = new JopiServer();
    const myWebSite = new WebSite("http://127.0.0.1");

    server.addWebsite(myWebSite);
    server.startServer();

    myWebSite.onGET("/**", test);
}