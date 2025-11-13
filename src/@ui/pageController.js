// noinspection JSUnusedGlobalSymbols
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
import React from "react";
import { decodeJwtToken, decodeUserInfosFromCookie, isUserInfoCookieUpdated, deleteCookie } from "./tools.ts";
import * as jk_events from "jopi-toolkit/jk_events";
import { isServerSide } from "jopi-toolkit/jk_what";
import { getDefaultObjectRegistry, ObjectRegistry } from "./objectRegistry.ts";
/**
 * Page controller is an object that can be accessed
 * from any React component from the `_usePage`hook.
 */
var PageController = /** @class */ (function () {
    function PageController(isDetached, options) {
        if (isDetached === void 0) { isDetached = false; }
        this.isDetached = isDetached;
        this.isServerSide = isServerSide;
        this.usedKeys = new Set();
        this.events = isServerSide ? jk_events.newEventGroup() : jk_events.defaultEventGroup;
        this.objectRegistry = isServerSide ? new ObjectRegistry() : getDefaultObjectRegistry();
        /**
         * Allow storing custom data inside the page context.
         */
        this.data = {};
        options = options || {};
        this.state = __assign({}, options);
    }
    //region ModuleInitContext_Host
    /**
     * Return the current page url.
     * For server-side: correspond to the url of the request.
     * For browser-side: is the navigateur url.
     */
    PageController.prototype.getCurrentURL = function () {
        if (this.serverRequest) {
            return this.serverRequest.urlInfos;
        }
        return new URL(window.location.href);
    };
    PageController.prototype.getUserInfos = function () {
        if (isServerSide)
            return this.userInfos;
        if (!this.userInfos) {
            this.userInfos = decodeUserInfosFromCookie();
        }
        return this.userInfos;
    };
    //endregion
    //region Page options (header/props/...)
    PageController.prototype.addToHeader = function (key, entry) {
        if (this.isServerSide) {
            if (!this.checkKey("h" + key))
                return this;
            if (!this.state.head)
                this.state.head = [entry];
            else
                this.state.head.push(entry);
        }
        else {
            // No browser-side support.
            // Why? Because React router only replaces the body.
        }
        return this;
    };
    PageController.prototype.addToBodyBegin = function (key, entry) {
        if (!this.checkKey("b" + key))
            return this;
        if (!this.state.bodyBegin)
            this.state.bodyBegin = [entry];
        else
            this.state.bodyBegin.push(entry);
        // Required to trigger a browser-side refresh of the body.
        this.onStateUpdated(this.state);
        return this;
    };
    PageController.prototype.addToBodyEnd = function (key, entry) {
        if (!this.checkKey("e" + key))
            return this;
        if (!this.state.bodyEnd)
            this.state.bodyEnd = [entry];
        else
            this.state.bodyEnd.push(entry);
        // Required to trigger a browser-side refresh of the body.
        this.onStateUpdated(this.state);
        return this;
    };
    PageController.prototype.setHeadTagProps = function (key, value) {
        if (this.isServerSide) {
            if (!this.state.headProps)
                this.state.headProps = {};
            this.state.headProps[key] = value;
        }
        return this;
    };
    PageController.prototype.setHtmlTagProps = function (key, value) {
        if (this.isServerSide) {
            if (!this.state.htmlProps)
                this.state.htmlProps = {};
            this.state.htmlProps[key] = value;
        }
        return this;
    };
    PageController.prototype.setBodyTagProps = function (key, value) {
        if (this.isServerSide) {
            if (!this.state.bodyProps)
                this.state.bodyProps = {};
            this.state.bodyProps[key] = value;
        }
        return this;
    };
    PageController.prototype.setPageTitle = function (title) {
        if (this.isServerSide) {
            this.state.pageTitle = title;
        }
        else {
            document.title = title;
        }
        return this;
    };
    PageController.prototype.checkKey = function (key) {
        if (this.usedKeys.has(key)) {
            return false;
        }
        this.usedKeys.add(key);
        return true;
    };
    //endregion
    PageController.prototype.refreshUserInfos = function () {
        if (!isServerSide && isUserInfoCookieUpdated()) {
            this.userInfos = decodeUserInfosFromCookie();
            jk_events.sendEvent("user.infosUpdated");
        }
    };
    PageController.prototype.logOutUser = function () {
        if (!isServerSide) {
            deleteCookie("authorization");
        }
        this.refreshUserInfos();
    };
    PageController.prototype.onStateUpdated = function (_state) {
        // Will be dynamically replaced.
    };
    PageController.prototype.onRequireRefresh = function () {
        // Will be dynamically replaced.
    };
    return PageController;
}());
export { PageController };
var PageController_ExposePrivate = /** @class */ (function (_super) {
    __extends(PageController_ExposePrivate, _super);
    function PageController_ExposePrivate() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    PageController_ExposePrivate.prototype.getOptions = function () {
        return this.state;
    };
    PageController_ExposePrivate.prototype.setServerRequest = function (serverRequest) {
        this.objectRegistry.registerObject("jopi.serverRequest", serverRequest);
        this.serverRequest = serverRequest;
        this.userInfos = decodeJwtToken(serverRequest.getJwtToken());
    };
    PageController_ExposePrivate.prototype.getServerRequest = function () {
        return this.serverRequest;
    };
    return PageController_ExposePrivate;
}(PageController));
export { PageController_ExposePrivate };
// Use undefined, otherwise the value is common for all requests when doing SSR.
export var PageContext = React.createContext(undefined);
