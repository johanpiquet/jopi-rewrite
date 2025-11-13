# Define 401, 404 and 500 error pages

You can create custom error pages to provide a user-friendly experience.

How to define:
- Create route files for errors such as:
  - src/.../@routes/errors/401.tsx
  - src/.../@routes/errors/404.tsx
  - src/.../@routes/errors/500.tsx
- These files must export a React component that renders the error UI.

Behavior:
- The framework will serve the appropriate page when an error occurs.
- For API responses, return the proper status codes and JSON error payloads.

Best practice:
- Keep error pages informative and avoid exposing technical details.

# 401, 404 and 500 pages

You can define a page to display when a 404 (not found) or 500 (server error) occurs. To do this, simply create an error404 page at `@routes/error404/page.tsx` and an error500 page at `@routes/error404/page.tsx`. The same applies for the 401 (unauthorized) error with an error401 page at `@routes/error404/page.tsx`.

Notes:
* The 404 error is cached in an immediate-access cache. It therefore cannot be customized.
* These pages are only returned for a GET request expecting an HTML response. For an API request, a simple response with the error code is returned.

