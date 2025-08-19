import { JopiRequest, WebSite } from "./core.ts";
declare class JopiEasy {
    new_webSite(hostName: string): JopiEasy_WebSiteBuilder;
}
declare class JopiEasy_WebSiteBuilder {
    protected readonly hostName: string;
    private readonly webSite;
    constructor(hostName: string);
    get_webSite_instance(): WebSite;
    add_fileServer(rootDir: string, options?: {
        replaceIndexHtml?: boolean;
        onNotFound?: (req: JopiRequest) => Response | Promise<Response>;
    }): this;
}
export declare const jopiEasy: JopiEasy;
export {};
