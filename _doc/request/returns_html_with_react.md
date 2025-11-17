# Returning HTML with React

Jopi makes it easy to transform a React component into HTML through two mechanisms:

*   React pages (see the router's `page.tsx` files).
*   The `req.reactResponse` function, which simply converts a React component into "dead" HTML code that does not react to events.

**Sample file onGET.tsx**
```typescript jsx
import {JopiRequest} from "jopi-rewrite";  
  
function MyComponent() {  
    const onClick = () => alert("don't works");  
    return <div id="mybutton" onClick={onClick}>MyComponent</div>;  
}  

export default async function(req: JopiRequest) {  
    // Will return: <div id="mybutton">MyComponent</div>
    return req.reactResponse(<MyComponent />);
}
```

The `req.reactResponse` function is useful when coupled with something like JQuery, but in general, its interest is limited.

The `req.reactToString` function is similar, but it simply transforms the React.js into a string.