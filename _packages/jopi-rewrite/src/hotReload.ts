
let gOnHotReload: any = {};
let gIsHotReload = false;

// @ts-ignore
if (globalThis["#jopi-hot-reload!"]) {
    // @ts-ignore
    gOnHotReload = globalThis["#jopi-hot-reload!"];
    gIsHotReload = true;
} else {
    // @ts-ignore
    globalThis["#jopi-hot-reload!"] = gOnHotReload;
}

export function keepIfHotReload<T>(key: string, builder: () => T): T {
    // @ts-ignore
    const oldValue = gOnHotReload[key];
    if (oldValue!==undefined) return oldValue;

    const value = builder();
    // @ts-ignore
    gOnHotReload[key] = value;

    return value;
}

export function clearHotReloadKey(key: string) {
    delete(gOnHotReload[key]);
}

export function onHotReload(listener: ()=>void) {
    if (!gOnHotReload.onHotReload) gOnHotReload.onHotReload = [];
    gOnHotReload.onHotReload.push(listener);
}

if (gIsHotReload) {
    const listeners = gOnHotReload.onHotReload as (()=>void)[];

    if (listeners) {
        gOnHotReload.onHotReload = [];
        listeners.forEach(l => l());
    }
}