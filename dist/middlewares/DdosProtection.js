import { getServerStartOptions } from "../core.js";
const newInterval = NodeSpace.timer.newInterval;
const applyDefaults = NodeSpace.applyDefaults;
let gGlobalBlackRequestListener;
/**
 * Allow setting a listener which is called when a black request is detected.
 * It'd mainly used to add his IP to a banned IP list.
 */
export function setGlobalBlackRequestListener(listener) {
    gGlobalBlackRequestListener = listener;
}
export default function (options) {
    options = applyDefaults(options, {
        sendHeadersTimeout_ms: 500,
        requestTimeout_sec: 60,
        timeInterval_ms: 1000,
        connectionLimit: 10,
        onBlackRequest: () => {
            return new Response("Too many request", { status: 429 });
        }
    });
    // Here it's a common value for all servers.
    getServerStartOptions().timeout = options.sendHeadersTimeout_ms;
    const mapConnectionsPerIP = new Map;
    const connectionLimit = options.connectionLimit;
    let mustReset = false;
    // The values here are reset after a delay.
    //
    newInterval(options.timeInterval_ms, () => {
        if (mustReset) {
            mapConnectionsPerIP.clear();
        }
    });
    return (req) => {
        // If we are here, it's mean the request take less than 1 second to send his headers.
        // It's why we can extend the time-out delay (60 secondes).
        //
        req.extendTimeout_sec(options.requestTimeout_sec);
        // > Check how many-time this request has reached the server recently.
        const clientIP = req.requestIP?.address;
        if (clientIP) {
            const currentConnections = (mapConnectionsPerIP.get(clientIP) || 0) + 1;
            if (currentConnections > connectionLimit) {
                if (gGlobalBlackRequestListener) {
                    const res = gGlobalBlackRequestListener(req);
                    if (res !== null)
                        return res;
                }
                return options.onBlackRequest(req);
            }
            mapConnectionsPerIP.set(clientIP, currentConnections);
            mustReset = true;
        }
        // Allow continuing to the next middleware.
        return null;
    };
}
;
//# sourceMappingURL=DdosProtection.js.map