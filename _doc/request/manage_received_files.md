# Manage received files

The `req.getBodyData` function allows decoding the received data, with the advantage of automatically handling the case of multi-part forms transmitting files. The client sends these files from a FormData object, or an HTML form.

**File onPOST.ts**
```typescript
import {JopiRequest} from "jopi-rewrite";  
  
export default async function(req: JopiRequest) {  
    const data = await req.getBodyData<FormValues>();  
  
    console.log("Server received:", data);  
  
    let photo = data.photo;  
    //  
    if (photo instanceof File) {  
        console.log("My file:", await photo.bytes());  
    }  

    return req.returnResultMessage(true);  
}
```