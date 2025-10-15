import {ModuleInitContext_UI} from "jopi-rewrite/ui";
import {MenuManager} from "../menu/index.ts";
import {getDefaultMenuManager} from "../menu/internal.ts";

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