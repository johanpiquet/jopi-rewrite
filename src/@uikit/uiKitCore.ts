import {ModuleInitContext_UI} from "jopi-rewrite/ui";
import {MenuManager} from "./menuManager.ts";
import {getDefaultMenuManager} from "./internal.ts";

export class UiKitModule extends ModuleInitContext_UI {
    protected override initialize() {
        this.objectRegistry.addObjectBuilder("uikit.menuManager", () => {
            if (this.isBrowserSide) {
                return getDefaultMenuManager();
            }

            return new MenuManager(this.getCurrentURL());
        });
    }

    getMenuManager(): MenuManager {
        return this.objectRegistry.getObject<MenuManager>("uikit.menuManager")!;
    }
}