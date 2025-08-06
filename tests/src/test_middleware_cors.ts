import {JopiServer, WebSite} from "jopi-rewrite";

const server = new JopiServer();
const myWebSite = server.addWebsite(new WebSite("http://127.0.0.1"));
server.startServer();

//highlight-next-line
myWebSite.enableCors();

myWebSite.onGET("/", req => {
    return req.htmlResponse("My response");
});