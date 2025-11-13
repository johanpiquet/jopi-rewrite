# Import an image

Static images can be imported and used in components.

Steps:
1. Place images under an assets folder (e.g., src/assets).
2. Import them in components:
   - import logo from '@/assets/logo.png'
3. Use the image in JSX:
   - <img src={logo} alt="Logo" />

Notes:
- Use appropriate optimization and responsive techniques for production.

In a route file `page.tsx` you can import an image directly.

```typescript
import logo from "./bun.png";

console.log(logo);

export default function () {
    return <img src={logo} alt="" />;
}
```

Here the variable `logo` contains either the image URL or a data URL — a string encoding the image binary — which allows embedding it directly in the generated HTML without relying on an external file.

The choice between a URL and a data URL is made automatically based on image size. Images below 3 KB are inlined as data URLs; larger images are referenced by URL. The image file is automatically exposed; you don't need to do anything special.

The size limit (3 KB) can be configured via `package.json`.

**Example configuration in package.json**
```json
{
  "jopi": {
    "inlineMaxSize_ko": 10
  }
}
```
