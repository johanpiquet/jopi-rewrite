# Using Tailwind CSS

## What is tailwind?

Tailwind is a tool that generates a CSS stylesheet after analyzing your source code.
It provides a great lot of CSS helpers classes, a very big number, while exporting only those that you really use.
Doing this allow you having a lot of CSS tool classes while keeping your final CSS small.

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

## Tailwind CSS template

You can configure Tailwind, to hack is default configuration. The most frequent use case being the need
to use a custom CSS template.

Here is an example where to use a custom template in order to enable Daisy UI:

```typescript
import {jopiApp} from "jopi-rewrite";

jopiApp.globalConfig().configure_tailwindProcessor()
    .setCssTemplate(`
@import "tailwindcss";
@plugin "daisyui";
    `)
```

