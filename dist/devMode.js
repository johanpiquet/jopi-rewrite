let gIsDevMode;
export function isDevMode() {
    if (gIsDevMode === undefined) {
        gIsDevMode = process.env.NODE_ENV !== 'production';
    }
    return gIsDevMode;
}
export function enableDevMode(devMode) {
    if (gIsDevMode !== undefined) {
        throw "enableDevMode: isDevMode has already be called.";
    }
    gIsDevMode = devMode;
}
//# sourceMappingURL=devMode.js.map