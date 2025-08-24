import "jopi-node-space";
import nodeJsServer from "./server_nodejs.js";
import bunJsServer from "./server_bunjs.js";
const serverImpl = NodeSpace.what.isBunJs ? bunJsServer : nodeJsServer;
export default serverImpl;
//# sourceMappingURL=server.js.map