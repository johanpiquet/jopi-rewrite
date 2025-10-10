export function addExtraCssToBundle(cssFilePath: string) {
    gHasManuallyIncludedCss = true;
    if (gAllCssFiles.includes(cssFilePath)) return;
    gAllCssFiles.push(cssFilePath);
}

export function hasExternalCssToBundle() {
    return gHasManuallyIncludedCss;
}

export function getExtraCssToBundle(): string[] {
    return gAllCssFiles;
}

export interface VirtualUrlEntry {
    route: string;
    sourceFile: string;
    bundleFile?: string;
}

const gVirtualUrlMap: VirtualUrlEntry[] = [];

export function getVirtualUrlMap() {
    return gVirtualUrlMap;
}

// @ts-ignore Is called by jopi-loader.
global.jopiAddMappedUrl = function(route: string, targetFile: string, isCSS: boolean) {
    if (isCSS) {
        addExtraCssToBundle(targetFile);
    }

    gVirtualUrlMap.push({route, sourceFile: targetFile});
}

let gHasManuallyIncludedCss = false;
const gAllCssFiles: string[] = [];