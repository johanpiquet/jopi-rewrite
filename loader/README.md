# Jopi Loader

## What is it?

jopi-loader is for node.js. It allows ignoring some imports: css / scss / jpg / ...

It's used with Jopi Rewrite projects, when you want to do React SSR and React Hydrate.
It allows node.js to ignore imports for CSS / images / ...

## Why?

If you have this in your project `import './style.css';` then node.js will throw an error
because it doesn't know how to handle CSS files. It's the same for other file formats (images/...).

Because it throws an error, this code can be used when doing React SSR and React Hydrate.
* Because you can't import CSS / images / ...
* And the libraries you use can't.

## How to use?

You have to import the dependency `jopi-loader` in your project.
Once done, two choices

First choice: you use the `--import` flag when running node.js
This allows loading this module before all other modules.
```
node --import jopi-loader ./myApp.js
```

