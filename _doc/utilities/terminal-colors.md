# Terminal Colors

> TODO: is now migrated to Jopi-Node-Space. Doc must be updated.

Jopi Rewrite provides a set of tools to write colored text in the terminal.

```typescript title="Writing colored text in the terminal"
console.log(terminalColor(`Welcome!`, TERMINAL_GREEN));
console.log(terminalColor(`Server is starting.`, TERMINAL_YELLOW_BACKGROUND));
console.log(terminalColor(`Server is stopped.`, TERMINAL_RED_BACKGROUND));
```