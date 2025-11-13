# Create an HTML response with React

Render React components on the server and return the HTML response.

Typical pattern:
1. Use a server renderer to convert React components to an HTML string.
2. Include the rendered HTML inside a full HTML document with proper headers.
3. Return the HTML with `Content-Type: text/html`.

Example outline:
```js
import { renderToString } from 'react-dom/server';
export async function onGET(request) {
  const html = renderToString(<App />);
  return new Response(`<!doctype html><html><head>...</head><body>${html}</body></html>`, {
    headers: { 'Content-Type': 'text/html' }
  });
}
```

Notes:
- Ensure scripts and hydration logic are included for the client to take over.
- Minimize blocking work during server rendering for good performance.
