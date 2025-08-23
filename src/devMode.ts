let gIsDevMode: boolean|undefined;

export function isDevMode(): boolean {
    if (gIsDevMode===undefined) {
        gIsDevMode = process.env.NODE_ENV !== 'production';
    }

    return gIsDevMode;
}

export function enableDevMode(devMode: boolean) {
    if (gIsDevMode!==undefined) {
        throw "enableDevMode: isDevMode has already be called."
    }

    gIsDevMode = devMode;
}