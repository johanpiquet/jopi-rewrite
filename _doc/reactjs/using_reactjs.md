# Using React.js

## So easy!

With Jopi Rewrite, using React.js is extremely easy! However, you need to understand that there are three different ways to use React.js.

* **React SSR**: Server Side Rendering - React is used to emit simple HTML from the server, without events and dynamics behaviors. 
* **React BSR**: Browser Side Rendering. - This is the ordinary way of using React.js.
* **React Hydrate** - This is a mix of both: SSR is replaced by BSR once in the browser.

If you know **NextJS** then you already know what **React Hydrate** is. It's very powerful and useful. Here, Jopi Rewrite allows you to do the same thing, but with a different philosophy.

## The `jopin` tool

To do React.js on server side, you need to use a tool named `jopin` (jopib for bun.js).
This tool allows you to import CSS and images, exactly like what you did when using Vite.js/WebPack.

See: [Installing JOPIN](_doc/how_to_start/installing_jopin.md)

## React SSR

Here is an example of React SSR. This allows using React.js as a simple HTML generator.

```typescript jsx
import {jopiApp} from "jopi-rewrite";

// Is automatically included!
import "./myButton.css";

jopiApp.startApp(jopiEasy => {
    jopiEasy.new_webSite("http://127.0.0.1")
        .add_path_GET("/**", async req => {
            return req.reactResponse(<MyButton />)
        })
})

function MyButton() {
    return <div className="my-button" 
            onClick={()=>alert("clicked!")}>Click me</div>;
}
```

> Here we have an `onClick` handler: which is ignored, since React SSR only product HTML
and ignore all events (it trims event handler). It also ignores calls to `onEffect` and similar functions. This is not a limitation of Jopi Rewrite, but how React SSR works, since his goal is
only producing HTML.

## React Hydrate

### What is React Hydrate?

Hydration is something very powerful and useful. The server returns dead HTML,
which only has the appearance of our React.js component but does not react to events.
This is what Google will see: simple, lifeless HTML, but with the correct appearance.

Then, once in the browser, this lifeless React component will be replaced by its living equivalent: a fully functional React component.

Jopi Rewrite automatically handles the complexity of this mechanism by injecting about twenty lines of JavaScript (it's very light).

> Hydratable components are only loaded in the browser if they are used.  
> If you define 1000 components and only use 5, then only the code for those five components will be loaded.

## How to do React Hydrate?

Here it's very similar to React SSR, only the way to create a component changes slightly since he must be flagged.

The difference with simple React SSR resides in the React component:
* He must be marked so that we know that he must be hydrated.
* He must be put inside a file without server side code.

```typescript jsx
import {jopiApp} from "jopi-rewrite";

import ComponentA from "./HydrateComponentA.tsx";

jopiApp.startApp(jopiEasy => {
    jopiEasy.new_webSite("http://127.0.0.1:3000")
        .add_path_GET("/**", async req => {
            return req.reactResponse(<ComponentA name="hello jopi" />)
        })
})
```

```typescript jsx
import React from "react";
import {mustHydrate, isServerSide} from "jopi-rewrite-ui";

// Will automatically be added to the HTML page.
import "./global-style.css";

// Jopi Rewrite allows CSS modules (css and scss supported).
// CSS modules are automatically inlined in the header of HTML pages.
// They are a better choice when you want to finely manage what CSS
// are inclued.
//
import styles from "./myComponentA.module.css";

const Component = function({name}: {name: string}) {
    function doClick(e: React.MouseEvent<HTMLDivElement, MouseEvent>) {
        e.preventDefault();
        alert("click !");
    }

    let text = name;
    if (isServerSide()) text += " (server side)";
    else text += " (browser side)";

    return <div style={styles} className="ComponentA" onClick={doClick}>{text}</div>;
};

// Note the 'mustHydrate' call here!
// And note the 'styles' params, allowing CSS moduels embeding.
export default mustHydrate(import.meta, Component, styles);
```

Here, `mustHydrate` is what marks our component, so that Jopi Rewrite knows it needs to hydrate it once in the browser.

You can open the page `http://127.0.0.1` and click on the displayed button. You will see that the `alert("click !")` is executed.  Also, the component displays `(browser side)`, while if you look at the HTML source code of the page you will see `(server side)`.

> **No Webpack!** 
> As you can see, you do not need to set up a tool like Webpack or ViteJS.
> The development workflow is simple, efficient, and incredibly fast.
>
> Internally, EsBuild is used, which is about 100 times faster than WebPack.  
> So there is no problem compiling a large codebase!