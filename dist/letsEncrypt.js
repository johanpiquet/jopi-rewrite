import * as acme from 'acme-client';
import { WebSiteImpl } from "./core.js";
import path from "node:path";
const nFS = NodeSpace.fs;
const nTimer = NodeSpace.timer;
var CertificateState;
(function (CertificateState) {
    CertificateState[CertificateState["DontExist"] = 0] = "DontExist";
    CertificateState[CertificateState["IsExpired"] = 1] = "IsExpired";
    CertificateState[CertificateState["IsOk"] = 2] = "IsOk";
})(CertificateState || (CertificateState = {}));
async function getCertificateState(certPaths, params) {
    if (!await nFS.isFile(certPaths.cert))
        return CertificateState.DontExist;
    if (!await nFS.isFile(certPaths.key))
        return CertificateState.DontExist;
    let proofFile = path.join(path.dirname(certPaths.cert), "_updateDate.txt");
    if (!await nFS.isFile(proofFile))
        return CertificateState.DontExist;
    // Using a file allows copying/paste the file or store it in GitHub.
    // It's better than checking his update date.
    //
    const sDate = await nFS.readTextFromFile(proofFile);
    if (!sDate)
        return CertificateState.DontExist;
    const now = new Date();
    let updateDate = parseInt(sDate);
    const diffDays = (now.getTime() - updateDate) / (1000 * 60 * 60 * 24);
    if (diffDays > params.expireAfter_days) {
        return CertificateState.IsExpired;
    }
    return CertificateState.IsOk;
}
function getCertificateDir(certDirPath, hostName) {
    const sslDirPath = path.resolve(certDirPath, hostName);
    return {
        key: path.join(sslDirPath, "certificate.key"),
        cert: path.join(sslDirPath, "certificate.crt.key")
    };
}
async function saveCertificate(certPaths, key, cert) {
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
export async function getLetsEncryptCertificate(httpsWebSite, params) {
    return checkWebSite(httpsWebSite, params, false);
}
export async function checkWebSite(httpsWebSite, params, isFromCron) {
    /**
     * Write a proof.
     */
    async function challengeCreateFn(_auth, challenge, keyAuthorization) {
        vChallengeToken = challenge.token;
        vKeyAuthorization = keyAuthorization;
    }
    /**
     * Remove the proof.
     */
    async function challengeRemoveFn(_auth, _challenge, _keyAuthorization) {
        if (canLog)
            console.log("LetsEncrypt - removing challenge");
    }
    if (!params.certificateDir)
        params.certificateDir = "certs";
    if (params.log === undefined)
        params.log = true;
    // Use 80 and not 90, to have a grace period.
    if (!params.expireAfter_days)
        params.expireAfter_days = 80;
    if (!params.timout_sec)
        params.timout_sec = 30;
    if (!params.isProduction === undefined) {
        // Need: NODE_ENV=production node app.js
        params.isProduction = process.env.NODE_ENV === 'production';
    }
    if (!params.isProduction) {
        console.warn("LetsEncrypt - Requesting as development");
    }
    // Will allow checking and replacing the certificate.
    //
    if (!isFromCron) {
        registerToCron(httpsWebSite, params);
    }
    // ACME challenge requires port 80 of the server.
    const webSite80 = httpsWebSite.getOrCreateHttpRedirectWebsite();
    const certPaths = getCertificateDir(params.certificateDir, webSite80.hostName);
    let canLog = params.log;
    let certState = await getCertificateState(certPaths, params);
    if (certState === CertificateState.IsOk) {
        if (!params.forceRenew) {
            if (canLog)
                console.log("LetsEncrypt - certificat is already valid");
            return;
        }
    }
    let vChallengeToken = "";
    let vKeyAuthorization = "";
    const host = new URL(webSite80.welcomeUrl).host;
    if (canLog) {
        if (certState == CertificateState.IsExpired)
            console.log("LetsEncrypt - Will renew certificate for", host);
        else
            console.log("LetsEncrypt - Requesting initial certificate for", host);
    }
    // Must be on port 80.
    webSite80.onGET("/.well-known/acme-challenge/**", async req => {
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
    const [key, csr] = await acme.crypto.createCsr({ commonName: host });
    const options = {
        csr,
        email: params.email,
        termsOfServiceAgreed: true,
        challengePriority: ['http-01'],
        challengeCreateFn,
        challengeRemoveFn,
    };
    let isResolved = false;
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
            if (isResolved)
                return;
            const error = new Error(`Let's Encrypt certificate request timed out after ${params.timout_sec} seconds`);
            error.code = "TIME_OUT";
            reject(error);
        }, params.timout_sec * 1000);
    });
    try {
        const cert = await Promise.race([
            client.auto(options),
            timeoutPromise
        ]);
        isResolved = true;
        if (canLog)
            console.log("LetsEncrypt - Certificate received for", host);
        await saveCertificate(certPaths, key.toString(), cert);
    }
    catch (error) {
        if (error.code === "TIME_OUT") {
            if (params.onTimeoutError) {
                params.onTimeoutError(httpsWebSite, isFromCron);
            }
            else {
                if (canLog)
                    console.error("LetsEncrypt - Request is time-out");
                throw error;
            }
        }
        // Re-lancer l'erreur originale si ce n'est pas un timeout
        throw error;
    }
    if (isFromCron) {
        webSite80.updateSslCertificate(certPaths);
    }
}
let gIsCronStarted = false;
const gWebsiteToCheck = [];
function startCron() {
    if (gIsCronStarted)
        return;
    gIsCronStarted = true;
    nTimer.newInterval(nTimer.ONE_DAY, () => {
        gWebsiteToCheck.forEach(ce => checkWebSite(ce.webSite, ce.params, true));
    });
}
function registerToCron(webSite, params) {
    if (!gIsCronStarted) {
        startCron();
    }
    gWebsiteToCheck.push({ webSite, params });
}
//# sourceMappingURL=letsEncrypt.js.map