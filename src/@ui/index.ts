import {isBrowser} from "jopi-toolkit/ns_what";

export * from "./tools.ts";
export * from "./page.tsx";
export * from "./mustHydrate.ts";
export * from "./cssModules.tsx";

export * from "./components.tsx";
export * from "./hooks.tsx";
export * from "./modules.ts";
export * from "./objectRegistry.ts";

export const isBrowserSide = isBrowser;
export const isServerSide = !isBrowser;