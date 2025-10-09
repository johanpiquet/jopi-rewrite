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

// @ts-ignore Is called by jopi-loader when found a CSS/SCSS file which isn't a module.
global.jopiOnCssImported = function(cssFilePath: string) {
    addExtraCssToBundle(cssFilePath);
}

let gHasManuallyIncludedCss = false;
const gAllCssFiles: string[] = [];