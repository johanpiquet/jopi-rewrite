import {createServer} from "./createServer";

await createServer(req => {
    return req.directProxyToServer();
})