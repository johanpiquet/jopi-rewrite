import {type JopiRouteHandler, JopiServer, PageCache, WebSite} from "jopi-rewrite";
import {ServerFetch} from "jopi-rewrite";

const url = "https://developer.mozilla.org"; const ip = "34.111.97.67";

export async function createServer(test: JopiRouteHandler, cache?: PageCache) {
    const server = new JopiServer();
    const hostName = new URL(url).hostname;
    const certificate = await server.createDevCertificate(hostName);
    const myWebSite = new WebSite(url, {certificate, cache});

    myWebSite.addSourceServer(ServerFetch.useOrigin("https://" + ip, url));
    server.addWebsite(myWebSite);
    server.startServer();

    myWebSite.onGET("/**", test);
}