# Use a CSS module

CSS Modules scope styles locally to components.

Usage:
1. Create a file named `Component.module.css`.
2. Import it in the component:
   - import styles from './Component.module.css'
3. Use the class in JSX:
   - <div className={styles.container}>...</div>

Benefits:
- Avoids global class name collisions.
- Works well with React component-based styling.

A CSS module is a piece of CSS whose class names are automatically renamed to avoid conflicts. This is the first advantage of CSS modules.

Their second advantage is that the module's CSS content is injected directly into the generated HTML without using an external file. If the component that imports the CSS module is not used, that CSS is not injected: only what is used is included.

Assuming we have this CSS file named `mystyle.module.css` (the `.module.css` suffix is important):

```css
.myText {
    color: blue;
    font-size: 40px;
}

.myButton {
    border: 1px solid red;
}
```

In this file the class names are simple and prone to conflict. That's not a problem because they will be renamed to unique names.

To do that we need a mapping that tells us the final name. In the following example, that's what we get in the `nameMap` variable.

```typescript
// When importing a CSS module, we get an object
// allowing us to know the final name of our class.
import nameMap from "./mystyle.module.css";

import {useCssModule} from "jopi-rewrite/ui";

export default function() {
    // Allow embedding the CSS rules into the HTML.
    useCssModule(nameMap);

    // Here nameMap.myButton returns the translated name.
    // Same for nameMap.myText.
    return <>
        <div className={nameMap.myButton}>
            <div className={nameMap.myText}>Test CSS Module</div>
        </div>
    </>;
}
```
