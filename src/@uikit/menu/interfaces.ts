import React from "react";

export enum MenuName {
    LEFT_MENU = "layout.left",
    RIGHT_MENU = "layout.right",
    TOP_MENU = "layout.top"
}

export interface MenuItem {
    key: string;
    items?: MenuItem[];

    title?: string;
    url?: string;
    icon?: any;
    isActive?: boolean;

    breadcrumb?: string[] | React.FunctionComponent<unknown>;

    /**
     * Is used as a key for React key calculation.
     */
    reactKey?: string;

    [key: string]: any;
}
