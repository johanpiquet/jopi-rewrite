Jopi Rewrite is designed to work with `bun.js`, which is an alternative to `Node.js`.
It's also works with Node.js, but this version is slow (du to node.js being himself slow
and an API which has some limitations).

Bun.js has several advantages over Node.js, including better performance and a more modern API. Also, Bun.js natively supports Typescript, which simplifies development. As you will see here, there is no need to compile Typescript into JavaScript.

The first step to working with Jopi Rewrite is therefore to install Bun.js.

> [!NOTE]  
> If you already have Node.js installed: `npm install bun -g`.  
> For Linux & MacOS: `curl -fsSL https://bun.sh/install | bash`.  
> For Windows: `powershell -c "irm bun.sh/install.ps1 | iex"`.

> [!NOTE]  
>Bun.js is highly compatible with Node.js and many things are similar.
>* You use `bun` where you used to use `node`.  
>  For example: `bun install` and `bun run start`.
>
>* Bun can directly run Typescript files: `bun index.ts`
