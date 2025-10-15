import type {ComponentAliasDef} from "./modules.ts";
import {PageController} from "./page.ts";

export const gComponentAlias: Record<string, ComponentAliasDef> = {};

export function getDefaultPageController(): PageController {
    if (!gDefaultPageController) gDefaultPageController = new PageController();
    return gDefaultPageController!;
}

let gDefaultPageController: PageController|undefined;