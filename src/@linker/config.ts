import type {LinkerConfig} from "./engine.ts";
import * as jk_app from "jopi-toolkit/jk_app";
import {Type_ArobaseChunk, Type_ArobaseList} from "./arobaseTypes.ts";
import TypeEvents from "./typeEvents.ts";
import TypeReplaces from "./typeReplaces.ts";
import {ModulesInitProcessor} from "./modulesInitProcessor.ts";

// Here it's ASYNC.
let gServerInstallFileTemplate = `__HEADER

export default async function(registry) {
__BODY__FOOTER
}`;

// Here it's not async.
let gBrowserInstallFileTemplate = `__HEADER

export default function(registry) {
__BODY__FOOTER
registry.events.sendEvent("app.init.ui", {myModule: registry});
}`;

export function getDefaultLinkerConfig(): LinkerConfig {
    return {
        projectRootDir: jk_app.findPackageJsonDir(),

        templateForServer: gServerInstallFileTemplate,
        templateForBrowser: gBrowserInstallFileTemplate,

        arobaseTypes: [
            new Type_ArobaseChunk("uiBlocks"),
            new Type_ArobaseChunk("uiComponents"),
            new Type_ArobaseChunk("uiChunks"),
            new Type_ArobaseList("uiComposites"),
            new TypeReplaces("replaces", "root"),
            new TypeEvents("events")
        ],

        modulesProcess: [
            new ModulesInitProcessor()
        ]
    }
}