## Node.js or Bun.js

Jopi Rewrite is designed to work with `node.js` and `bun.js`, which is an alternative to `node.js`. The first step to working with Jopi Rewrite is therefore to install node.js, or bun.js.

> If you want high performances, DDOS protection and hot-reload, then you must use `bun.js` since this features can't be implemented with node.js.



## How to install Bun.js

If you already have Node.js installed: `npm install bun -g`
* For Linux & MacOS: `curl -fsSL https://bun.sh/install | bash`. 
* For Windows: `powershell -c "irm bun.sh/install.ps1 | iex"`

> [!TIP]  
>Bun.js is highly compatible with Node.js and many things are similar.
>* You use `bun` where you used to use `node`.  
>  For example: `bun install` and `bun run start`.
>
>* Bun can directly run Typescript files: `bun index.ts`
