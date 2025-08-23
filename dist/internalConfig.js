import { isDevMode } from "./devMode.js";
const config = {
    enableBrowserRefresh: true
};
export function getInternalConfig() {
    return config;
}
let g_mustEnableBrowserRefresh;
export function mustEnableBrowserRefresh() {
    if (g_mustEnableBrowserRefresh === undefined) {
        if (isDevMode()) {
            g_mustEnableBrowserRefresh = config.enableBrowserRefresh;
        }
        else {
            g_mustEnableBrowserRefresh = false;
        }
    }
    return g_mustEnableBrowserRefresh;
}
//# sourceMappingURL=internalConfig.js.map