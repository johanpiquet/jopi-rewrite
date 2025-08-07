import {createServer} from "./createServer";
import {JopiRequest} from "jopi-rewrite";

function addCacheUpdateDateComment(text: string): string {
    const comment = "Jopi - Cache updated at: " + new Date().toISOString();
    text += "\n\n<!--\n" + comment + "\n-->";
    return text;
}

function replaceSomeHtml(html: string, req: JopiRequest) {
    //region Avec Bun.js HTMLRewriter
    // https://bun.sh/docs/api/html-rewriter

    const rewriter = new HTMLRewriter();

    // Ici je remplace les liens par un lien vers google.
    //
    rewriter.on("a", {
        element(node) {
            console.log("href -->", node.getAttribute("href"));
            node.setAttribute("href", "https://www.google.fr");
        }
    });

    rewriter.on("img", {
        element(node) {
            console.log("img -->", node.getAttribute("src"));
        }
    });

    //endregion

    //region Avec Cheerio
    // https://cheerio.js.org/docs/intro

    const $ = req.asJquery(html);

    const found = $(".label-wrapper.mfn-menu-label-wrapper > .menu-label").first();
    found.html("Remplacé par Cheerio !!!");

    html = $.html();

    //endregion

    return rewriter.transform(html);
}

await createServer(async req => {
    let res = await req.fetchServer(undefined, "GET");

    res = await req.hookIfHtml(res, replaceSomeHtml, addCacheUpdateDateComment);

    res = await req.hookIfCookie(res, "myCookie",
        cookie => cookie === "admin",
        text => text + "<!-- With cookie ! -->"
    );

    return res;
});