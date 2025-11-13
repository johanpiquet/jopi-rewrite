import * as jk_app from "jopi-toolkit/jk_app";
import { Type_ArobaseChunk } from "./arobaseTypes.ts";
import TypeEvents from "./typeEvents.ts";
import TypeUiComposite from "./typeUiComposite.ts";
import ModInstaller from "./modInstaller.ts";
import TypeRoutes from "./typeRoutes.ts";
// Here it's ASYNC.
var gServerInstallFileTemplate = "__HEADER\n\nexport default async function(registry, onWebSiteCreated) {\n__BODY__FOOTER\n}";
// Here it's not async.
var gBrowserInstallFileTemplate = "__HEADER\n\nexport default function(registry) {\n__BODY__FOOTER\n    registry.events.sendEvent(\"app.init.ui\", {myModule: registry});\n}";
export function getDefaultLinkerConfig() {
    return {
        projectRootDir: jk_app.findPackageJsonDir(),
        templateForServer: gServerInstallFileTemplate,
        templateForBrowser: gBrowserInstallFileTemplate,
        arobaseTypes: [
            new Type_ArobaseChunk("uiBlocks"),
            new Type_ArobaseChunk("uiComponents"),
            new Type_ArobaseChunk("uiChunks"),
            new TypeUiComposite("uiComposites"),
            new TypeEvents("events"),
            new TypeRoutes("routes", "root")
        ],
        modulesProcess: [
            new ModInstaller()
        ]
    };
}
