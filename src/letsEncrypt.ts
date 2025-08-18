import * as acme from 'acme-client';
import type {WebSite} from "./core.tsx";

export interface LetsEncryptParams {
    email: string;
    isProduction: boolean;
}

export async function getLetsEncryptCertificate(webSite: WebSite, params: LetsEncryptParams) {
    let gChallengeToken = "";
    let gKeyAuthorization = "";

    /**
     * Write a proof.
     */
    async function challengeCreateFn(_authz: acme.Authorization, challenge: any, keyAuthorization: string): Promise<void> {
        gChallengeToken = challenge.token;
        gKeyAuthorization = keyAuthorization;
    }

    /**
     * Remove the proof.
     */
    async function challengeRemoveFn(_authz: acme.Authorization, challenge: any, keyAuthorization: string) {
        /*if (challenge.type === 'http-01') {
            const filePath = `${challengePath}${challenge.token}`;
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }*/
    }

    const host = new URL(webSite.welcomeUrl).host;

    // Must be on port 80.
    webSite.onGET("/.well-known/acme-challenge/**", req => {
        if (req.url.endsWith(gChallengeToken)) {
            return req.textResponse(gKeyAuthorization);
        }

        return req.error404Response();
    });

    const client = new acme.Client({
        directoryUrl: params.isProduction ? acme.directory.letsencrypt.production : acme.directory.letsencrypt.staging,
        accountKey: await acme.crypto.createPrivateKey()
    });

    // CSR: Certificate Signing Request
    const [key, csr] = await acme.crypto.createCsr({commonName: host});

    const options: acme.ClientAutoOptions = {
        csr,
        email: params.email,
        termsOfServiceAgreed: true,
        challengePriority: ['http-01'],

        challengeCreateFn,
        challengeRemoveFn,
    };

    const cert = await client.auto(options);

    return {key, cert};
}