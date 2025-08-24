import { type JopiMiddleware } from "../core.tsx";
// slowhttptest -c 1000 -H -i 10 -r 200 -t GET -u http://my-server -x 24 -p 3
export interface DdosProtectionOptions {
    /**
     * If the request takes more than n-milliseconds to send his headers, then we reject this request.
     * Warning: this value is global to all websites. Setting it will affect all of them.
     * Default: 500 ms.
     */
    sendHeadersTimeout_ms?: number;
    /**
     * Delay in millisecondes after which the request timeout.
     * Default: 60 seconds.
     */
    requestTimeout_sec?: number;
    /**
     * We will limit the number of calls allowed during an interval.
     * Here it's the size of this interval in milliseconds.
     * Default is 1000 ms (one second).
     *
     * The default behaviors are that you can do more than 10 calls to the same second with the same IP.
     * If you need an exception for an IP, use onBlackRequest
     */
    timeInterval_ms?: number;
    /**
     * We will limit the number of calls allowed during an interval.
     * Here's the number of connections allowed during this interval of time.
     * Default is 10.
     *
     * The default behaviors are that you can do more than 10 calls to the same second with the same IP.
     * If you need an exception for an IP, use onBlackRequest
     */
    connectionLimit?: number;
    /**
     * Is call if a request is detected as an anomaly.
     */
    onBlackRequest?: JopiMiddleware;
}
/**
 * Allow setting a listener which is called when a black request is detected.
 * It'd mainly used to add his IP to a banned IP list.
 */
export declare function setGlobalBlackRequestListener(listener: JopiMiddleware): void;
export default function (options?: DdosProtectionOptions): JopiMiddleware;
