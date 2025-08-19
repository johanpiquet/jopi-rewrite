import * as acme from 'acme-client';
import type {SslCertificatePath, WebSite} from "./core.tsx";
import path from "node:path";

const nFS = NodeSpace.fs;

export interface LetsEncryptParams {
    certificateDir?: string;
    email: string;

    log?: boolean;
    isProduction?: boolean;
    forceRenew?: boolean;
    
    expireAfter_days?: number;
}

async function isCertificatePerempted(certPaths: SslCertificatePath, params: LetsEncryptParams) {
    if (!await nFS.isFile(certPaths.cert)) return true;
    if (!await nFS.isFile(certPaths.key)) return true;

    let proofFile = path.join(path.dirname(certPaths.cert), "_updateDate.txt");
    if (!await nFS.isFile(proofFile)) return true;

    // Using a file allows copying/paste the file or store it in GitHub.
    // It's better than checking his update date.
    //
    const sDate = await nFS.readTextFromFile(proofFile);
    if (!sDate) return false;

    const now = new Date();
    let updateDate = parseInt(sDate);
    const diffDays = (now.getTime() - updateDate) / (1000 * 60 * 60 * 24);

    return diffDays > params.expireAfter_days!;
}

function getCertificateDir(certDirPath: string, hostName: string): SslCertificatePath {
    const sslDirPath = path.resolve(certDirPath, hostName);

    return {
        key: path.join(sslDirPath, "certificate.key"),
        cert:path.join(sslDirPath, "certificate.crt.key")
    };
}

async function saveCertificate(certPaths: SslCertificatePath, key: string, cert: string): Promise<void> {
    await nFS.mkDir(path.dirname(certPaths.cert));
    await nFS.writeTextToFile(certPaths.key, key);
    await nFS.writeTextToFile(certPaths.cert, cert);

    let proofFile = path.join(path.dirname(certPaths.cert), "_updateDate.txt");
    await nFS.writeTextToFile(proofFile, Date.now().toString());
}

/**
 * Download a LetsEncrypt certificate.
 * Will be renewed if no current certificat or if the current one is perempted.
 */
export async function getLetsEncryptCertificate(webSite: WebSite, params: LetsEncryptParams): Promise<void> {
    /**
     * Write a proof.
     */
    async function challengeCreateFn(_authz: acme.Authorization, challenge: any, keyAuthorization: string): Promise<void> {
        vChallengeToken = challenge.token;
        vKeyAuthorization = keyAuthorization;
    }

    /**
     * Remove the proof.
     */
    async function challengeRemoveFn(_authz: acme.Authorization, challenge: any, keyAuthorization: string) {
        if (canLog) console.log("LetsEncrypt - removing challenge");
    }
    
    if (!params.certificateDir) params.certificateDir = "certs";
    if (params.log===undefined) params.log = true;
    if (!params.expireAfter_days) params.expireAfter_days = 90;

    if (!params.isProduction===undefined) {
        // Need: NODE_ENV=production node app.js
        params.isProduction = process.env.NODE_ENV === 'production';
    }

    if (!params.isProduction) {
        console.warn("LetsEncrypt - Requesting as development");
    }

    const certPaths = getCertificateDir(params.certificateDir, webSite.hostName);
    let canLog = params.log;

    if (!params.forceRenew) {
        if (!await isCertificatePerempted(certPaths, params)) {
            if (canLog) console.log("LetsEncrypt - certificat is already valid");
            return;
        }
    }

    let vChallengeToken = "";
    let vKeyAuthorization = "";

    const host = new URL(webSite.welcomeUrl).host;

    if (canLog) console.log("LetsEncrypt - Requesting certificate for", host);

    // Must be on port 80.
    webSite.onGET("/.well-known/acme-challenge/**", req => {
        console.log("LetsEncrypt - requested ", req.url);
        
        if (req.url.endsWith(vChallengeToken)) {
            console.log("LetsEncrypt - returning the auth", vKeyAuthorization);
            return req.textResponse(vKeyAuthorization);
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

    if (canLog) console.log("LetsEncrypt - Certificate received for", host);
    
    await saveCertificate(certPaths, key.toString(), cert);
}