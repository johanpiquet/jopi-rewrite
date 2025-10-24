import {addArobaseType, addModuleDirProcess} from "./engine.ts";
import TypeReplaces from "./typeReplaces.ts";
import TypeEvents from "./typeEvents.ts";
import {Type_ArobaseChunk, Type_ArobaseList} from "./arobaseTypes.ts";
import {ModulesInitProcessor} from "./modulesInitProcessor.ts";

addArobaseType(new TypeReplaces("replaces", "root"));
addArobaseType(new TypeEvents("events"));

addArobaseType(new Type_ArobaseChunk("uiBlocks"));
addArobaseType(new Type_ArobaseChunk("uiComponents"));
addArobaseType(new Type_ArobaseChunk("uiChunks"));
addArobaseType(new Type_ArobaseList("uiComposites"));

addModuleDirProcess(new ModulesInitProcessor());