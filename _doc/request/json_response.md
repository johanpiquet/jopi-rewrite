# Create a JSON response

To return JSON from an API route in Jopi:

Example:
```js
export async function onGET(request) {
  const payload = { ok: true, data: [] };
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
```

Guidelines:
- Use appropriate HTTP status codes.
- Include informative error messages for failures.
- Set caching headers when the response is cacheable.
