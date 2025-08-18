import * as acme from 'acme-client';
export async function getLetsEncryptCertificate(webSite, params) {
    let gChallengeToken = "";
    let gKeyAuthorization = "";
    /**
     * Write a proof.
     */
    async function challengeCreateFn(_authz, challenge, keyAuthorization) {
        gChallengeToken = challenge.token;
        gKeyAuthorization = keyAuthorization;
    }
    /**
     * Remove the proof.
     */
    async function challengeRemoveFn(_authz, challenge, keyAuthorization) {
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
    const [key, csr] = await acme.crypto.createCsr({ commonName: host });
    const options = {
        csr,
        email: params.email,
        termsOfServiceAgreed: true,
        challengePriority: ['http-01'],
        challengeCreateFn,
        challengeRemoveFn,
    };
    const cert = await client.auto(options);
    return { key, cert };
}
//# sourceMappingURL=letsEncrypt.js.map