import {JopiServer, WebSite} from "jopi-rewrite";

const server = new JopiServer();
const myWebSite = server.addWebsite(new WebSite("http://127.0.0.1"));
server.startServer();

//http://127.0.0.1/index.html
myWebSite.onGET("/**", req => {
    return req.serveFile("./my-static-website", {
        // Will replace "/index.html" in the browser navbar by "/".
        replaceIndexHtml: true,

        // The default behavior to return "req.error404Response()".
        // Here for this sample, we choose to redirect to the home page.
        onNotFound: req => req.redirectResponse(false, "/404-not-found.html")
    });
});