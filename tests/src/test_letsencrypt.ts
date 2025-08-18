import {JopiServer, WebSite, getLetsEncryptCertificate} from "jopi-rewrite";

const server = new JopiServer();

const myHttpsWebSite = server.addWebsite(new WebSite("https://johan-piquet.fr"));

// ACME challenge requires port 80 of the server.
const myHttpWebSite = myHttpsWebSite.createHttpDirectWebsite();
server.addWebsite(myHttpWebSite);

server.startServer();

let certificate = await getLetsEncryptCertificate(myHttpWebSite, {
    email: "my-mail@gmail.com",
    isProduction: false
});

console.log(certificate);