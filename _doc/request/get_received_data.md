# Get received data

Several functions allow you to obtain the data sent to the server.

* `req.getBodyData` returns the data from the body. It detects the encoding of this data and decodes it correctly.
* `req.urlSearchParams` returns the information encoded in the URL (after the `?`).
* `req.getReqData` returns the concatenation of all data. Those from the URL and those from the body.

If you know for sure the data source (URL or body) and its encoding, then you can use a more direct and slightly more performant method.
* `req.reqBodyAsJson` for a body in JSON format.
* `req.reqBodyAsFormData` for a body in form-data format.
* `res.isReqBodyXFormUrlEncoded` for a URL in x-form format.

**Sample onPOST.ts file**
```typescript
import {JopiRequest} from "jopi-rewrite";  
  
export default async function(req: JopiRequest) {  
    const myData = await req.getBodyData();  
    return req.jsonResponse(myData);  
}
```