import { type WebSite } from "./core.tsx";
export type OnTimeoutError = (webSite: WebSite, isRenew: boolean) => void;
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
    /**
     * Is called if there is an error.
     */
    onTimeoutError?: OnTimeoutError;
}
/**
 * Download a LetsEncrypt certificate.
 * Will be renewed if no current certificat or if the current one is perempted.
 */
export declare function getLetsEncryptCertificate(httpsWebSite: WebSite, params: LetsEncryptParams): Promise<void>;
export declare function checkWebSite(httpsWebSite: WebSite, params: LetsEncryptParams, isFromCron: boolean): Promise<void>;
