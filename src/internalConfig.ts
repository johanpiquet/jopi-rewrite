import {isDevMode} from "./devMode.ts";

const config: any = {
    enableBrowserRefresh: true
};

export function getInternalConfig() {
    return config;
}

let g_mustEnableBrowserRefresh: boolean|undefined;

export function mustEnableBrowserRefresh() {
    if (g_mustEnableBrowserRefresh===undefined) {
        if (isDevMode()) {
            g_mustEnableBrowserRefresh = config.enableBrowserRefresh;
        } else {
            g_mustEnableBrowserRefresh = false;
        }
    }

    return g_mustEnableBrowserRefresh;
}