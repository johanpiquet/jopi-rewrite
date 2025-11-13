# Using the page cache

Jopi provides a flexible page cache to improve response times.

Cache scopes:
- Global: the same HTML cached for all users.
- Per-user: the cache takes the authenticated user into account.
- Device-specific: differentiate desktop and mobile responses.
- Custom keys: based on headers, query parameters, or route parameters.

Configuration:
- Set the TTL (time-to-live) and invalidation rules in your route or module configuration.
- Clear or update the cache programmatically when underlying data changes.

Guidelines:
- Cache public pages aggressively.
- For personalized content, prefer granular caches or server-side revalidation.
