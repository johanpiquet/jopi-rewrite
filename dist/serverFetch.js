// noinspection JSUnusedGlobalSymbols
import { JopiRequest } from "./core.js";
export class ServerFetch {
    options;
    lastURL;
    /**
     * The load-balancer will attach himself if this instance
     * is used by a load balancer.
     */
    loadBalancer;
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
    static fromTo(sPublicUrl, sTargerUrl, hostName, options) {
        const publicUrl = new URL(sPublicUrl);
        const targetUrl = new URL(sTargerUrl);
        sTargerUrl = targetUrl.toString().slice(0, -1);
        if (!hostName)
            hostName = targetUrl.hostname;
        return new ServerFetch({
            ...options,
            rewriteUrl(url, headers) {
                const urlInfos = new URL(url);
                urlInfos.port = targetUrl.port;
                urlInfos.protocol = targetUrl.protocol;
                urlInfos.hostname = targetUrl.hostname;
                if (hostName) {
                    headers.set('Host', hostName);
                }
                return urlInfos;
            },
            translateRedirect(url) {
                if (url[0] === "/") {
                    url = sTargerUrl + url;
                }
                const urlInfos = new URL(url);
                urlInfos.port = publicUrl.port;
                urlInfos.protocol = publicUrl.protocol;
                urlInfos.hostname = publicUrl.hostname;
                return urlInfos;
            }
        });
    }
    static useOrigin(serverOrigin, hostName, options) {
        const urlOrigin = new URL(serverOrigin);
        if (!hostName)
            hostName = urlOrigin.hostname;
        return new ServerFetch({
            ...options,
            rewriteUrl(url, headers) {
                const urlInfos = new URL(url);
                urlInfos.port = urlOrigin.port;
                urlInfos.protocol = urlOrigin.protocol;
                urlInfos.hostname = urlOrigin.hostname;
                if (hostName) {
                    headers.set('Host', hostName);
                }
                return urlInfos;
            }
        });
    }
    static useAsIs(options) {
        return new ServerFetch(options);
    }
    constructor(options) {
        options = options || {};
        this.options = options;
        if (!options.data)
            options.data = {};
        if (!options.headers)
            options.headers = new Headers();
        if (options.userDefaultHeaders !== false)
            this.useDefaultHeaders();
        this.compileCookies();
        if (options.publicUrl) {
            const url = new URL(options.publicUrl);
            options.headers.set('X-Forwarded-Proto', url.protocol.replace(':', ''));
            options.headers.set('X-Forwarded-Host', url.host);
            let ignorePort = false;
            if (url.protocol === 'http:') {
                if (!url.port || (url.port === "80")) {
                    ignorePort = true;
                }
            }
            else {
                if (!url.port || (url.port === "443")) {
                    ignorePort = true;
                }
            }
            if (!ignorePort) {
                options.headers.set('X-Forwarded-Port', url.port);
            }
        }
    }
    async checkIfServerOk() {
        if (!this.lastURL)
            return false;
        let url = new URL(this.lastURL);
        url.pathname = "/";
        const res = await this.fetch("GET", url);
        return res.status < 500;
    }
    useDefaultHeaders() {
        const headers = this.options.headers;
        const json = {
            "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
            "connection": "keep-alive",
            "cache-control": "max-age=0",
            "dnt": "1",
            "upgrade-insecure-requests": "1",
            "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
            "sec-fetch-mode": "navigate",
            "sec-fetch-dest": "document",
            "accept-encoding": "gzip, deflate, br, zstd",
            "accept-language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7,es;q=0.6",
            "sec-ch-ua": "\"Not)A;Brand\";v=\"8\", \"Chromium\";v=\"138\", \"Google Chrome\";v=\"138\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"macOS\"",
            "sec-fetch-site": "none",
            "sec-fetch-user": "?1"
        };
        for (const [key, value] of Object.entries(json)) {
            headers.set(key, value);
        }
    }
    compileCookies() {
        if (!this.options.cookies)
            return;
        let cookies = '';
        for (const [name, value] of Object.entries(this.options.cookies)) {
            cookies += `;${name}=${value}`;
        }
        if (cookies) {
            this.options.headers?.set("Cookies", cookies.substring(1));
        }
    }
    /**
     * Allow directly proxy a request as-if we were directly asking the target server.
     */
    async directProxy(req) {
        return this.doFetch(req.method, req.urlInfos.href, req.body, req.headers);
    }
    async fetch(method, url, body, headers) {
        return this.doFetch(method, url.toString(), body, headers);
    }
    async fetch2(method, url, body, headers) {
        return this.doFetch(method, url, body, headers);
    }
    normalizeUrl(urlInfos) {
        // To known: urlInfos.toString() always add a "/" at the end for the root.
        // new URL("http://127.0.0.1") --> http://127.0.0.1/
        if (urlInfos.pathname.length <= 1 && this.options.removeRootTrailingSlash) {
            return urlInfos.origin;
        }
        return urlInfos.href;
    }
    /**
     * Allow fetching some content.
     */
    async doFetch(method, url, body, headers) {
        const bckURL = url;
        if (!headers) {
            if (this.options.headers)
                headers = this.options.headers;
            else
                headers = new Headers();
        }
        // Avoid some protections using the referer.
        //headers.delete("Referer");
        if (this.options.rewriteUrl) {
            let urlInfos = this.options.rewriteUrl(url, headers, this);
            url = this.normalizeUrl(urlInfos);
        }
        const fetchOptions = {
            method: method,
            headers: headers,
            verbose: this.options.verbose,
            // Allow avoiding automatic redirections.
            // @ts-ignore
            redirect: 'manual',
            body: body,
            // Allow avoiding SSL certificate check.
            //
            rejectUnauthorized: false,
            requestCert: false,
            tls: {
                rejectUnauthorized: false,
                checkServerIdentity: () => { return undefined; }
            },
            // Required by node.js
            duplex: "half"
        };
        if (this.options.beforeRequesting) {
            const res = this.options.beforeRequesting(url, fetchOptions, this.options.data);
            if (res instanceof Promise)
                await res;
        }
        this.lastURL = url;
        try {
            let r = await fetch(url, fetchOptions);
            if (r.status >= 300 && r.status < 400) {
                let location = r.headers.get('location');
                if (location) {
                    if (this.options.translateRedirect) {
                        location = this.normalizeUrl(this.options.translateRedirect(location));
                        r.headers.set('Location', location);
                    }
                    r = new Response(null, { status: r.status, headers: r.headers });
                }
            }
            if (this.options.verbose) {
                console.log(`Fetched [${r.status}]`, url);
                if (!r.body)
                    console.log("Response hasn't a body");
                const ct = r.headers.get("content-length");
                if (ct !== undefined && ct === '0')
                    console.log(`Response content-length: ${length}`);
            }
            // Avoid a bug where r.body isn't encoded while the head say he his.
            let encoding = r.headers.get("content-encoding");
            if (encoding !== null) {
                r.headers.delete("content-encoding");
            }
            return r;
        }
        catch (e) {
            if (this.options.ifServerIsDown) {
                // Allow we to know there is something fishy.
                const r = this.options.ifServerIsDown(this, this.options.data);
                if (r instanceof Promise) {
                    const result = await r;
                    // We can retry to send the request?
                    if (result.newServer) {
                        if (this.loadBalancer) {
                            this.loadBalancer.replaceServer(this, result.newServer, result.newServerWeight);
                        }
                        return result.newServer.doFetch(method, bckURL, body, headers);
                    }
                }
            }
            // 521: Web Server Is Down.
            return new Response(null, { status: 521 });
        }
    }
}
// Allow disable ssl certificate verification.
//process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
//# sourceMappingURL=serverFetch.js.map