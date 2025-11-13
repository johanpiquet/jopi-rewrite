# Use Tailwind CSS

Tailwind CSS is preconfigured to work with Jopi projects.

Steps:
1. Ensure Tailwind is included in the project dependencies.
2. Configure tailwind.config.js if you need custom themes or purge rules.
3. Import the compiled CSS in your root layout or entry point (e.g., `import './styles.css'`).

Notes:
- The dev setup includes HMR for styles so changes appear instantly.
- Use utility classes in React components to create consistent UIs.

## What is Tailwind CSS?

Tailwind CSS is a utility-first CSS framework that avoids writing custom CSS rules by providing many utility classes. It only includes the classes you actually use.

This approach keeps the generated stylesheets small and optimized. The trade-off is that Tailwind must scan your code to determine which classes are used, which can require configuration — but not with Jopi, because Tailwind is already configured and enabled by default.

## Disable Tailwind CSS

Tailwind CSS is configured and enabled by default. If it doesn't suit your project, you can disable it from the project's root index.ts file:

**Disable Tailwind**
```typescript
jopiEasy
	   .configure_tailwindProcessor()
	   .disableTailwind();
```

## Define the "global.css"

The Tailwind engine expects a `global.css` file to exist and will look for it at startup. You can define it in several ways, listed here by priority.

1. Programmatically specify its path or contents.
2. If you use ShadCN, the `components.json` configuration will be used.
3. If a `global.css` file is found at the project root (next to `package.json`), it will be used.
4. Otherwise, it will default to using the content `@import "tailwindcss";`.

Here is an example showing how to programmatically set the file path (option 1).

```typescript
jopiEasy
    .configure_tailwindProcessor()
    .setGlobalCssFilePath("./global2.css");
```
