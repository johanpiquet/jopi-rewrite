import { JopiRequest, JopiServer, WebSite } from "./core.js";
class JopiEasy {
    new_webSite(hostName) {
        return new JopiEasy_WebSiteBuilder(hostName);
    }
}
class JopiEasy_WebSiteBuilder {
    hostName;
    webSite;
    constructor(hostName) {
        this.hostName = hostName;
        this.webSite = new WebSite(this.hostName);
        myServer.addWebsite(this.webSite);
        autoStartServer();
    }
    get_webSite_instance() {
        return this.webSite;
    }
    add_fileServer(rootDir, options) {
        if (!options)
            options = {};
        if (options.replaceIndexHtml === undefined)
            options.replaceIndexHtml = true;
        if (!options.onNotFound)
            options.onNotFound = req => req.error404Response();
        this.webSite.onGET("/**", req => {
            return req.serveFile(rootDir, {
                replaceIndexHtml: options.replaceIndexHtml,
                onNotFound: options.onNotFound
            });
        });
        return this;
    }
}
let gIsAutoStartDone = false;
function autoStartServer() {
    if (gIsAutoStartDone)
        return;
    gIsAutoStartDone = true;
    setTimeout(() => {
        myServer.startServer();
    }, 5);
}
const myServer = new JopiServer();
export const jopiEasy = new JopiEasy();
//# sourceMappingURL=jopiEasy.js.map