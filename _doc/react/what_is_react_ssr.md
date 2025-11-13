# Using React on the Server

Server-side rendering (SSR) produces HTML on the server for faster initial rendering and improved SEO.

How Jopi uses SSR:
- React components are rendered on the server into HTML.
- The response includes the HTML plus client-side JavaScript for hydration.
- After hydration, the page becomes fully interactive.

Recommendations:
- Keep server-rendered components deterministic and avoid browser-only APIs.
- Use the jopiBundler_ifServer / jopiBundler_ifBrowser pattern to separate server and browser code when necessary.
