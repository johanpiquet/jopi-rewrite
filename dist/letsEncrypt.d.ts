import type { WebSite } from "./core.tsx";
export interface LetsEncryptParams {
    email: string;
    certificateDir?: string;
    log?: boolean;
    isProduction?: boolean;
    forceRenew?: boolean;
    expireAfter_days?: number;
    /**
     * Allow stopping if the certificate isn't renewed after this delay.
     * Will to an error with error.code="TIME_OUT".
     */
    timout_sec?: number;
}
/**
 * Download a LetsEncrypt certificate.
 * Will be renewed if no current certificat or if the current one is perempted.
 */
export declare function getLetsEncryptCertificate(webSite: WebSite, params: LetsEncryptParams): Promise<void>;
