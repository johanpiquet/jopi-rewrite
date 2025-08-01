import {createServer} from "./createServer";
import {getInMemoryCache} from "jopi-rewrite";

const cache = getInMemoryCache();

await createServer(async req => {
    const fromCache = await req.getFromCache();
    if (fromCache) return fromCache;

    console.log("InMemoryCache - Not in cache:", req.url);

    let res = await req.fetchServer("GET");
    return req.addToCache_Compressed(res, {"my": "meta"});
}, cache);