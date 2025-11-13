import { PageController } from "./pageController.ts";
export var gComponentAlias = {};
export function getDefaultPageController() {
    if (!gDefaultPageController)
        gDefaultPageController = new PageController();
    return gDefaultPageController;
}
var gDefaultPageController;
