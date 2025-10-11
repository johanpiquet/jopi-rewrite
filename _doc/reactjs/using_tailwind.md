# Using Tailwind CSS

## What is tailwind?

Tailwind is a tool that generates a CSS stylesheet after analyzing your source code.
It provides a great lot of CSS helpers classes, a very big number, while exporting only those that you really use.
Doing this allows you to have a lot of CSS tool classes while keeping your final CSS small.

> Website of Tailwind: https://tailwindcss.com/

Jopi Rewrite automatically handles Tailwind CSS for React Hydrate components: you have nothing to do.

Here is a sample component using Tailwind. Here, all the CSS classes (mx-auto, gap-x-4, ...) are from tailwind.

## Sample usage

```typescript jsx
const Component = function() {
    return <div
        className="mx-auto flex max-w-sm items-center gap-x-4 rounded-xl bg-white p-6 shadow-lg outline outline-black/5 dark:bg-slate-800 dark:shadow-none dark:-outline-offset-1 dark:outline-white/10">
        <img className="size-12 shrink-0" src="./bun.png" alt="ChitChat Logo"/>
        <div>
            <div className="text-xl font-medium text-black dark:text-white">ChitChat</div>
            <p className="text-red-500">You have a new message!</p>
        </div>
    </div>
};

export default mustHydrate(import.meta, Component);
```

## Configuring Tailwind

Tailwind is automatically configured, and this default configuration allows basic usage.

When configuring Tailwind, you have two important things:
* The `global.css` file, which contains Tailwind CSS rules.
* The configuration object used by Tailwind.

### The global.css file

This file contains things like '@import "tailwindcss";' which allows inserting Tailwind CSS rules.
When this file is found, he is automatically imported and used globally in your project.

You have three options to define this file:
* Use a `components.json` (it's used by see ShadCN) with a tailwind.css property, which point to the location of your file.
* Put a `global.css` in the same folder as your `package.json` file.
* Directly define this file content programmatically.

**Sample defining the global.css content**
```typescript
jopiApp.globalConfig()
    .configure_tailwindProcessor()
    .setGlobalCssContent(`@import "tailwindcss";`)
```

### The configuration

When using Tailwind CLI tool **(without Jopi Rewrite)** you need a `tailwind.config.js` file.    
With Jopi Rewrite, this tool is bundled inside the framework and doesn't need extra-steps.

To configure Tailwind, you must use the framework API, which is very similar.

**Sample Tailwind config**
```typescript
jopiApp.globalConfig()
    .configure_tailwindProcessor()
    .setConfig({
        // Add extra content to scanne.
        // (your project file will be automatically added)
        // See: https://tailwindcss.com/docs/detecting-classes-in-source-files
        content: [
            './src/**/*.{js,ts,jsx,tsx}',
            './src/routes/**/*.{js,ts,jsx,tsx}',
            './public/index.html',
        ],

        // Allows extending the theme.
        // See: https://tailwindcss.com/docs/theme
        theme: {
            // Extend allows adding, without erasing existing values.
            extend: {
                colors: {
                    'primary': '#FF6600',
                    'secondary': '#00AAFF'
                },
                spacing: {
                    '128': '32rem'
                },
                borderRadius: {
                    '4xl': '2rem'
                }
            }
        },

        // Allows using extra plugins.
        // See: https://tailwindcss.com/docs/adding-custom-styles#functional-utilities
        plugins: [
            // Exemple de plugins officiels
            require('@tailwindcss/typography'),
            require('@tailwindcss/forms')
        ]
    })
```

### Disabling Tailwind

Tailwind is automatically enabled. If you don't want to use it, you need to disable it manually.

**Sample disabling Tailwind**
```typescript
jopiApp.globalConfig()
    .configure_tailwindProcessor()
    .disableTailwind();
```