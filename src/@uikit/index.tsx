import {isBrowser} from "jopi-node-space/ns_what";

// Expose all his item to simplify things.
export * from "jopi-rewrite/ui";

export * from "./helpers/index.ts";
export * from "./forms/index.ts";
export * from "./users/index.ts";
export * from "./menu/index.ts";
export * from "./components/index.ts";
export * from "./core/index.ts";

export const isBrowserSide = isBrowser;
export const isServerSide = !isBrowser;
