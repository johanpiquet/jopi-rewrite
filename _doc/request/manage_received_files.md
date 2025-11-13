# Handle received files

Handle file uploads sent as multipart/form-data.

Steps:
1. Parse the incoming form data:
   - `const form = await request.formData();`
2. Extract file fields and process:
   - `const file = form.get('file');` // file is a Blob or File-like object
3. Store files securely:
   - Stream to disk or upload to object storage.
4. Validate file size and type before saving.

Security:
- Sanitize file names and avoid executing uploaded content.
- Enforce limits to prevent resource exhaustion.

The function `req.getBodyData` allows decoding received data, with the advantage of automatically handling the multipart form case that transmits files. The client sends these files from a FormData object or an HTML form.

**onPOST.ts file**
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

