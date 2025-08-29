## The tool jopin

`jopin` is a very import tool for Jopi Rewrite if you want to use React SSR (server side) and React Dynamic. It extends node.js engine capacities, adding missing thing. It's also a useful tool allowing automatically restarting your code when a change is detected.  

### First goal: make things easier

Jopi Rewrite comes with a subproject named `jopi-loader` which allow importing CSS and image with node.js. Ordinary node.js code doesn't allow things like `import "./mystyle.css` which is a big problem when we  want to do React on server side (React SSR).

The difficulty with jopi-loader, is that he must be loaded as a node.js plugin, which requires adding special options when executing node.js. For exemple, you will have to do `node --import jopi-loader ./myScript.js`.

> The goal of jopin, is to avoid this extra argument. Doing `jopin ./myScript.js --some --options` is like doing `node --import jopi-loader ./myScript.js --some --options`

### Second goal: auto-restart and refresh

The goal of the first versions of jopin was only avoiding this extra argument (--import jopi-loader).  Then later the auto-restart and auto-refresh capability was added.

* Auto restart: when a change is detected in the source repo, then the server is restarted.
* Auto refresh: allows refreshing the browser to update the visual.

> Auto-restart and auto-refresh are only available in development mode.  
> To switch to production mode, you have to set the environnement variable `NODE_ENV` to `production`
> (which is a node.js convention).
 
## Installing jopin (for node.js)

`jopin` is part of the project jopi-loader.  

To install jopin, you must install this project globally.

```shell
npm install jopi-loader --global
```

## Installing jopib (for bun.js)

`jopib` is his counterpart for bun.js.  
How can install it with `bun install jopi-loader --global`.

## Documentation

You can found information on the github project [here](https://github.com/johanpiquet/jopi-loader).  
This includes options to customize behavior through `package.json` options.