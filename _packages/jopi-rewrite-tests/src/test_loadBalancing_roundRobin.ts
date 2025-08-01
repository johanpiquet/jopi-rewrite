import {JopiServer, ServerFetch, WebSite} from "jopi-rewrite";

const targetUrl = "https://developer.mozilla.org";

const server = new JopiServer();
const sslCertificate = await server.createDevCertificate(new URL(targetUrl).hostname);

const myWebSite = new WebSite(targetUrl, {certificate: sslCertificate});

function buildServer(offset: number) {
    return ServerFetch.useOrigin("https://34.111.97.67", "developer.mozilla.org", {
        beforeRequesting(url) { console.log("Using server", offset, "for url", url) }
    });
}

function buildKoServer(offset: number) {
    return ServerFetch.useOrigin("http://donexist_111ddndkdhd", undefined, {
        beforeRequesting(url) {
            console.log("Using ko server", offset, "for url", url)
        },

        ifServerIsDown() {
            console.log("Server is ko:", "donexist_111ddndkdhd");

            // Return nothing, or the replacement server.
            return Promise.resolve({
                newServer: buildServer(offset),
                newServerWeight: 1 // Optional
            });
        }
    });
}

myWebSite.addSourceServer(buildKoServer(1), 1);

server.addWebsite(myWebSite);
server.startServer();

myWebSite.onGET("/**", req => {
    return req.directProxyToServer();
});