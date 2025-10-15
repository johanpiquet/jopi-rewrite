// This file is called by "loader.tsx" when the browser loads.
// It's injected through a call to "addGlobalUiInitFile".

import {UiKitModule} from "./UiKitModule.ts";

// Allow providing an instance of UiKitModule in place of ModuleInitContext_UI.
(window as any)["_JOPI_CREATE_MODULE_INIT_CONTEXT_"] = function() { return new UiKitModule() };