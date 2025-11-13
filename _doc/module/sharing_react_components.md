# Share React components

To share UI components between modules:

1. Place shared components inside a module's `@alias` folder (for instance `@alias/uiBlocks/`).
2. Export components with stable names and documented props.
3. Import shared components in other modules using the alias path:
   - import MyComp from '@/uiBlocks/MyComp'

Guidelines:
- Keep shared components generic and configurable.
- Document expected props and behavior to ease reuse.

## The @alias/uiBlocks folder

This folder lets you define and share React components between different modules. Anything you put in this folder will be accessible to other modules via a very simple mechanism, shown below.

**Example shared component**
```
|- mod_moduleA/
   |- @alias/
      |- uiBlocks/
         |- page.header/           < The component name
            |- index.tsx           < Expose the component
            |- default.priority    < Automatically added if missing
```

## Sharing a component

Here the component we exposed is named `page.header`. Its content is defined in `index.tsx` as follows:

**Content of index.tsx**
```typescript tsx
export default function() {
    return <div>Page Header</div>
}
```

## Using a shared component

To access this component from any module and anywhere in your code, simply do this.

**Using the shared component**
```typescript tsx
import PageHeader from "@/uiBlocks/page.header";

export default function() {
    return <>
      <div>The header:</div>
      <PageHeader />
    </>
}
```
