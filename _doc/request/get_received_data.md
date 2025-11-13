# Get received input data

Read incoming data depending on content type.

JSON:
```js
const body = await request.json();
```

Form data:
```js
const form = await request.formData();
```

Query parameters:
```js
const url = new URL(request.url);
const param = url.searchParams.get('q');
```

Best practices:
- Validate and sanitize all incoming data.
- Return clear validation errors with appropriate status codes (400/422).
