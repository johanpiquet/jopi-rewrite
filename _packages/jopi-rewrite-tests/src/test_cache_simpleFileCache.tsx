import {createServer} from "./createServer";
import {SimpleFileCache} from "jopi-rewrite";

const cache = new SimpleFileCache("./temp/cache");

await createServer(async req => {
    const fromCache = await req.getFromCache(true);
    if (fromCache) return fromCache;

    console.log("SimpleFileCache - Not in cache:", req.url);

    let res = await req.fetchServer("GET");
    return req.addToCache_Compressed(res, {"my": "meta"});
}, cache);