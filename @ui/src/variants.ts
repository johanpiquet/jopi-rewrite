import React from "react";
import {generateUUIDv4} from "jopi-node-space/ns_tools";

export class VariantProvider<T = any> {
    private readonly variants: Record<string, React.FC<T>> = {};
    private default?: React.FC<T>;

    constructor(public readonly uid: string) {
    }

    getDefault(): React.FC<T> {
        if (!this.default) throw new Error("No default variant for " + this.uid);
        return this.default;
    }

    setDefault(variant: React.FC<T>) {
        this.default = variant;
        return variant;
    }

    get(name?: string|undefined): React.FC<T> {
        if (!name) return this.getDefault();

        const r = this.variants[name];
        if (!r) return this.getDefault();
        return r;
    }

    set(name: string, variant: React.FC<T>) {
        this.variants[name] = variant;
    }
}

export function getVariantProvider<T = any>(uid: string) {
    if (!uid) throw new Error("uid is required. You can use: " + generateUUIDv4());
    let provider = gVariantProviders[uid];

    if (!provider) {
        provider = new VariantProvider<T>(uid);
        gVariantProviders[uid] = provider;
    }

    return provider;
}

export function setDefaultVariant<T>(uid: string, variant: React.FC<T>) {
    getVariantProvider(uid).setDefault(variant);
}

const gVariantProviders: Record<string, VariantProvider> = {}

export type WithVariant<T> = T & { variant?: string; };


//const VariantContext = React.createContext<VariantProvider>(undefined);