import { JopiRequest, type SendingBody } from "./core.tsx";
import type { LoadBalancer } from "./loadBalancing.ts";
export interface ServerDownResult<T> {
    newServer?: ServerFetch<T>;
    newServerWeight?: number;
}
export interface FetchOptions {
    headers?: Headers;
    method?: string;
    verbose?: boolean;
}
export interface ServerFetchOptions<T> {
    /**
     * Allow automatically removing the trailing slashs for the website root.
     * If I have http://127.0.0.1/, then it's begun http://127.0.0.1
     * Default value is false.
     */
    removeRootTrailingSlash?: boolean;
    /**
     * Is called before a request.
     * Is used to start the server if we are doing headless.
     */
    beforeRequesting?: (url: string, fetchOptions: FetchOptions, data: T) => void | Promise<void>;
    /**
     * Is called if we detect that the server is down.
     * Allow starting a script which will restart the server
     * or send a mal to the admin.
     *
     * @returns
     *      true if we can retry the call.
     *      false if we can't.
     */
    ifServerIsDown?: (fetcher: ServerFetch<T>, data: T) => void | Promise<ServerDownResult<T>>;
    headers?: Headers;
    userDefaultHeaders?: boolean;
    cookies?: {
        [key: string]: string;
    };
    verbose?: boolean;
    /**
     * The public url of the website.
     * It's the url that he must use to build the url in his content.
     * It's not the url of the server where he can be reached.
     *
     * Setting a public url will allow automatically setting the X-Forwarded-Host and X-Forwarded-Proto headers.
     */
    publicUrl?: string | URL;
    /**
     * An object which will be sent to beforeRequesting.
     * Will also be where ifServerIsDown can store his state.
     */
    data?: T;
    /**
     * Allow rewriting the url for complex cases.
     */
    rewriteUrl?: (url: string, headers: Headers, fetcher: ServerFetch<any>) => URL;
    /**
     * Allow rewriting a redirection.
     */
    translateRedirect?: (url: string) => URL;
}
export declare class ServerFetch<T> {
    private readonly options;
    private lastURL;
    /**
     * The load-balancer will attach himself if this instance
     * is used by a load balancer.
     */
    loadBalancer?: LoadBalancer;
    /**
     * Create an instance that translates urls from an origin to a destination.
     *      Ex: http://127.0.0.1                --> https://www.mywebiste.com
     *      Ex: https://my-server.com           --> https://134.555.666.66:7890  (with hostname: my-server.com)
     *
     * @param sPublicUrl
     *      The origin of our current website.
     * @param sTargerUrl
     *      The origin of the target website.
     * @param hostName
     *      Must be set if toOrigin use an IP and not a hostname.
     *      (will set the Host header)
     * @param options
     *      Options for the ServerFetch instance.
     */
    static fromTo<T>(sPublicUrl: string, sTargerUrl: string, hostName?: string, options?: ServerFetchOptions<T>): ServerFetch<T>;
    static useOrigin<T>(serverOrigin: string, hostName?: string, options?: ServerFetchOptions<T>): ServerFetch<T>;
    static useAsIs<T>(options?: ServerFetchOptions<T>): ServerFetch<T>;
    protected constructor(options?: ServerFetchOptions<T> | undefined);
    checkIfServerOk(): Promise<boolean>;
    private useDefaultHeaders;
    private compileCookies;
    /**
     * Allow to directly proxy a request as is we were directly asking the target server.
     */
    directProxy(req: JopiRequest): Promise<Response>;
    fetch(method: string, url: URL, body?: SendingBody, headers?: Headers): Promise<Response>;
    fetch2(method: string, url: string, body?: SendingBody, headers?: Headers): Promise<Response>;
    normalizeUrl(urlInfos: URL): string;
    /**
     * Allow fetching a some content.
     */
    private doFetch;
}
