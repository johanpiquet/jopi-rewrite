# Import a CSS file

To include a CSS file:

1. Place the CSS file under src or an assets folder.
2. Import it in your root layout or main entry file:
   - import './styles.css'
3. Ensure the bundler processes the file and includes it in the build.

Tips:
- For global styles prefer a single import in the root layout.
- For component-level styles use CSS modules or scoped solutions.

In a route file `page.tsx`, when you import a CSS or SCSS (Sass) file that CSS is included in the page's HTML after being minified.

```
import "./mystyle-1.css";
import "./mystyle-2.scss";
```

Referenced CSS is included only by the pages that import it: there is no global bundle. If you want to create a global bundle, create a common file that imports multiple CSS files.
