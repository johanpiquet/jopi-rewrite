import * as n_what from "jopi-node-space/ns_what";

export function isServerSide(): boolean {
    return n_what.isServerSide;
}

export function isBrowserSide(): boolean {
    return n_what.isBrowser;
}