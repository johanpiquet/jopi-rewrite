# Override an existing route

To override a route provided by a module:

1. Create a route with the same path in your application module or in a module with a higher priority.
2. The framework resolves conflicts using module priority so the definition from the higher-priority module takes effect.

Use cases:
- Customize pages from a shared module.
- Patch or extend behavior without modifying the original module.

Notes:
- Keep override modules minimal and clearly documented so behavior is easy to track.

## Replacing an existing route

A module can declare a route that already exists. In that case, the new declaration will replace the previous one. If you declare a page using a `page.tsx` file it will overwrite the previous page if one already existed. The same applies for `onPOST.ts`, `onPUT.ts`, etc.

The tricky part is the order in which modules are evaluated. Which one will overwrite the other?

For that reason a priority mechanism exists to indicate which module is more important.

Example:

```
|- mod_moduleA
   |- @routes/product/listing/
       |- default.priority           < Automatically created if no priority is set
       |- page.tsx
       |- onPOST.ts
|- mod_moduleB
   |- @routes/product/listing/
       |- high.priority              < Higher priority
       |- page.tsx                   < This will replace the page from moduleA
       |- onPUT.ts                   < onPUT is added (plus the old onPOST)
```

Priority levels are:
* verylow.priority
* low.priority
* default.priority
* high.priority
* veryhigh.priority

The point of the verylow and low levels is to allow defining defaults: an element without an explicit priority has the default level and will automatically overwrite existing lower-priority items. Using verylow and low is therefore a way to define fallback/default values.
