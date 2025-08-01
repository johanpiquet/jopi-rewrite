import {buildSearchParamFilter, JopiServer, WebSite} from "jopi-rewrite";

const server = new JopiServer();
const myWebSite = server.addWebsite(new WebSite("http://127.0.0.1"));
server.startServer();

// Will filter our home page params.
const searchFilter_HomePage = buildSearchParamFilter({}, {
    // For param "hello", only "world" and "jopi" are accepted as values.
    hello: {values: ["world", "jopi"]}
});

// Will filter our search page params.
const searchFilter_SearchPage = buildSearchParamFilter({}, {
    // Form param "sort", only "asc" is accepted.
    sort: {values: ["asc"]},

    // For param "query", all values are accepted.
    // Warning: when it's the case, then you must NOT put the page in cache!
    query: {allowAllValues: true}
});

// We must use on filter per type of page.
myWebSite.onGET("/**", req => {
    const urlBefore = req.urlInfos.toString();
    req.filterSearchParams(searchFilter_HomePage);
    return req.htmlResponse(`Url before: ${urlBefore}<br/>Url after: ${req.urlInfos.toString()}<br/>`);
});

// Add an exception for our search page.
myWebSite.onGET("/search", req => {
    const urlBefore = req.urlInfos.toString();
    req.filterSearchParams(searchFilter_SearchPage);
    return req.htmlResponse(`Url before: ${urlBefore}<br/>Url after: ${req.urlInfos.toString()}<br/>`);
});