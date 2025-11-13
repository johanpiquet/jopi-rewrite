// noinspection JSUnusedGlobalSymbols
import React from "react";
export function setHandler_bundleExternalCss(listener) {
    gHandler_bundleExternalCss = listener;
}
export var CssModule = function (_a) {
    var module = _a.module;
    return <style>{module.__CSS__}</style>;
};
export function getCssModuleStyle(cssModule) {
    return cssModule ? cssModule.__CSS__ : "";
}
export function mustBundleExternalCss(importMeta, cssFilePath) {
    gHandler_bundleExternalCss(importMeta, cssFilePath);
}
var gHandler_bundleExternalCss = function () { };
