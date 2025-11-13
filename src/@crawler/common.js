var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
export var ProcessUrlResult;
(function (ProcessUrlResult) {
    /**
     * The resource has been downloaded.
     */
    ProcessUrlResult["OK"] = "ok";
    /**
     * The resource was a redirection.
     */
    ProcessUrlResult["REDIRECTED"] = "redirected";
    /**
     * An error occurred while processing the resource
     * or the resources is an error page.
     */
    ProcessUrlResult["ERROR"] = "error";
    /**
     * The resource has been ignored.
     * Probably because it was already downloaded.
     */
    ProcessUrlResult["IGNORED"] = "ignored";
})(ProcessUrlResult || (ProcessUrlResult = {}));
var UrlSortTools = /** @class */ (function () {
    function UrlSortTools(allUrls) {
        this.allUrl = allUrls;
    }
    /**
     * Remove the urls for which the filter response true
     * and return an array with the extracted urls.
     */
    UrlSortTools.prototype.remove = function (filter) {
        var removed = [];
        var others = [];
        this.allUrl.forEach(function (url) {
            if (filter(url))
                removed.push(url);
            else
                others.push(url);
        });
        this.removed = removed;
        this.allUrl = others;
        return this;
    };
    UrlSortTools.prototype.sortAsc = function () {
        this.allUrl = this.allUrl.sort();
        return this;
    };
    UrlSortTools.prototype.addRemovedBefore = function () {
        if (!this.removed)
            return this;
        this.allUrl = __spreadArray(__spreadArray([], this.removed, true), this.allUrl, true);
        this.removed = undefined;
        return this;
    };
    UrlSortTools.prototype.addRemovedAfter = function () {
        if (!this.removed)
            return this;
        this.allUrl = __spreadArray(__spreadArray([], this.allUrl, true), this.removed, true);
        this.removed = undefined;
        return this;
    };
    UrlSortTools.prototype.result = function () {
        return this.allUrl;
    };
    return UrlSortTools;
}());
export { UrlSortTools };
