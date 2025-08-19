import * as acme from 'acme-client';
import type { WebSite } from "./core.tsx";
export interface LetsEncryptParams {
    email: string;
    isProduction: boolean;
}
export declare function getLetsEncryptCertificate(webSite: WebSite, params: LetsEncryptParams): Promise<{
    key: acme.PrivateKeyBuffer;
    cert: string;
}>;
