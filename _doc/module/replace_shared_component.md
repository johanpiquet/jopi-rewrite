# Replace a shared component

Modules can replace exposed components using a priority mechanism.

How it works:
- Create a replacement component in another module exposing the same export name.
- Assign a higher module priority so the framework resolves to your replacement.

Considerations:
- Keep the replacement API compatible with the original to avoid breaking consumers.
- Document why the replacement was made and list differences if any.

Each module can expose React components that other modules can use. Sometimes, for your application's needs, you'd like to replace a component with a different version.

To replace a component, declare a component with the same name and give it a higher priority.

```
|- mod_moduleA
|  |- @alias/uiBlocks/page.header
|     |- index.tsx
|     |- default.priority          < Automatically added if no priority
|- mod_moduleB
|  |- @alias/uiBlocks/page.header
|     |- index.tsx
|     |- high.priority             < Has higher priority
```

Here, the `page.header` component from moduleB has a higher priority. That's why its version of the component will be used.

The different priority levels are:
* verylow.priority
* low.priority
* default.priority
* high.priority
* veryhigh.priority

The system supports several naming variants for these files. It lowercases the name and removes hyphens and underscores. Thus you can write `Very-Low.priority` or `very_low.priority`; they will be normalized to `verylow.priority`.

The point of the verylow and low levels is that an element without a priority (which means a default.priority) will automatically override existing lower-priority items. Using verylow and low is therefore a way to provide a default value for an item.
