import {JopiServer, ServerFetch, AutomaticStartStop, WebSite} from "jopi-rewrite";

/**
 * Will allow starting a PHP server expose inside a docker
 * and automatically stop it when not need anymore.
 */
const startStop = new AutomaticStartStop({
    name: "my little server",

    // Will check if 'docker' exist on the system.
    // This by doing a "which docker".
    //
    requireTool: "docker",

    // Will automatically stop the docker
    // if not request are emitted after 2 minutes.
    //
    autoShutdownAfter_ms: 1000 * 60 * 2,

    // Is called to start our docker.
    onStart: async () => {
        console.log("I'm starting !");
        await Bun.$`cd phpDocker; docker compose up -d`;
        console.log("I'm started !");
    },

    // And to stop it.
    onStop: async () => {
        console.log("I'm stopping !");
        await Bun.$`cd phpDocker; docker compose down`;
        console.log("I'm stopped !");
    }
});

const server = new JopiServer();
const certificate = await server.createDevCertificate("127.0.0.1");
const myWebSite = new WebSite("https://127.0.0.1", {certificate});

myWebSite.addSourceServer(ServerFetch.useOrigin("http://127.0.0.1:8080", undefined, {
    // Is called before each request.
    beforeRequesting: () => {
        // Calling start will start our docker.
        // If already started, then it will allow
        // the system to know that the tool continues to be needed.
        // Otherwise, the automatic shutdown will be executed after 2 minutes.
        //
        return startStop.start();
    }
}));

server.addWebsite(myWebSite);
server.startServer();

myWebSite.onGET("/**", req => req.directProxyToServer());