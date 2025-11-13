# Use catch-all URLs

Catch-all routes match multiple path segments.

Example:
- src/.../@routes/docs/[...slug]/page.tsx → matches `/docs/a/b/c`

Behavior:
- The `slug` parameter will be provided as an array of path segments.
- Use catch-all routes for documentation, file previews, or any nested content structure.

Implementation tips:
- Handle an empty array for the base path (e.g., `/docs`).
- Normalize and validate segments before using them to locate resources.
