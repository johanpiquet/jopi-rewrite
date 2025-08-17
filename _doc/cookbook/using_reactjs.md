# Using React.js

## So easy!

With Jopi Rewrite, using React.js is extremely easy! However, you need to understand that there are three different ways to use React.js.

* **React SSR**: Server Side Rendering.  
React SSR consists of using React.js on the server side, to make it easier to write the HTML code that the server returns.
The React.js component is transformed into simple HTML, which is called *dead* because it does not respond to any events.

* **React BSR**: Browser Side Rendering.  
This is the ordinary way of using React.js.

* **React Hydrate**: which is a mix of both.  
We do React SSR, but once in the browser, the HTML is replaced by the real component.
This replacement is done automatically and transparently; the website user sees nothing.

If you know **NextJS** then you already know what **React Hydrate** is. It's very powerful and useful.
Here, Jopi Rewrite allows you to do the same thing, but with a different philosophy.

## React SSR

Here is an example of React SSR. If you open the page http://127.0.0.1 in your browser,
then look at its source code, you will only see this: `<div>Click me</div>`.

```typescript
import {JopiServer, WebSite} from "jopi-rewrite";
import React from "react";
import "./MyButton.css"; // <- is ignored with React SSR

const server = new JopiServer();

const myWebSite = new WebSite("http://127.0.0.1");
server.addWebsite(myWebSite);
server.startServer();

function MyButton() {
    return <div className="my-button" onClick={()=>alert("clicked!")}>Click me</div>;
}

myWebSite.onGET("/", req => {
    return req.reactResponse(<MyButton />);

    // You can also do this:
    //return req.htmlResponse(req.reactToString(<MyButton />));
});
```

With React SSR, you have to manage the CSS yourself. Here, the file `MyButton.css` is ignored.
The good news is that there is a mechanism to automatically include CSS,
however in React SSR, CSS is deliberately ignored to give you more control.

## React Hydrate

Hydration is something very powerful and useful. The server returns dead HTML,
which only has the appearance of our React.js component but does not react to events.
This is what Google will see: simple, lifeless HTML, but with the correct appearance.

Then, once in the browser, this lifeless React component will be replaced by its living equivalent: a fully functional React component.

Jopi Rewrite automatically handles the complexity of this mechanism, by injecting about twenty lines of JavaScript.
Hydratable components are only loaded in the browser if they are used. If you define 1000 components and only use 5, then only the code for those five components will be loaded.

Here, the way of working is the same as in React SSR, only the way to create a component changes slightly.

```typescript
import {JopiServer, WebSite} from "jopi-rewrite";
import React from "react";
//highlight-next-line
import ComponentA from "./ComponentA";

const server = new JopiServer();

const myWebSite = new WebSite("http://127.0.0.1");
server.addWebsite(myWebSite);
server.startServer();

myWebSite.onGET("/", req => {
    //highlight-next-line
    return req.reactResponse(<ComponentA name="hello jopi" />);
});
```

The difference is in `ComponentA`, which must:
* Be marked, so that it is known it needs to be hydrated.
* Exist in a dedicated file (only one hydratable component per file).

```typescript title="File ComponantA.tsx"
import React from "react";
import {asJopiHydrateDiv, isServerSide} from "jopi-rewrite-ui";

// CSS are automatically imported when doing React Hydrate.
// Here our css makes our component red with yellow background.
// (scss files are css with sass preprocessor)
//
//highlight-next-line
import "./ComponentA.scss"

function MyComponent({name}: {name: string}) {
    function doClick(e: React.MouseEvent<HTMLDivElement, MouseEvent>) {
        e.preventDefault();
        alert("click !");
    }

    let text = "Hello " + name;
    if (isServerSide()) text += " (server side)";
    else text += " (browser side)";

    return <div className="ComponentA" onClick={doClick}>
        <div className="welcome">{text}</div>
    </div>;
};

//highlight-next-line
export default mustHydrate(import.meta, MyComponent);
```

Here, `mustHydrate` is what marks our component, so that Jopi Rewrite knows it needs to hydrate it
once in the browser.

You can open the page `http://127.0.0.1` and click on the displayed button. You will see that the `alert("click !")` is executed.
Also, the component displays `(browser side)`, while if you look at the HTML source code of the page you will see `(server side)`.

## No Webpack!

As you can see, you do not need to set up a tool like Webpack or ViteJS.
The development workflow is simple, efficient, and incredibly fast. Internally, EsBuild is used,
which is 100 times faster than WebPack. So there is no problem compiling a large codebase!