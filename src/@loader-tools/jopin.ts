import fs from "node:fs";
import {type ChildProcess, spawn} from "node:child_process";
import path from "node:path";
import * as jk_app from "jopi-toolkit/jk_app";
import * as jk_fs from "jopi-toolkit/jk_fs";
import * as jk_os from "jopi-toolkit/jk_os";
import * as jk_term from "jopi-toolkit/jk_term";

// *************************
const FORCE_LOG = false;
const VERSION = "20251014a";
// *************************

let mustLog = false; // Set env var JOPI_LOG to 1 to enable.

interface WatchInfos {
    needWatch: boolean;
    needUiWatch: boolean;
    needHot?: boolean;

    hasJopiWatchTask?: boolean;
    hasJopiWatchTask_node?: boolean;
    hasJopiWatchTask_bun?: boolean;

    packageJsonFilePath?: string;
}

enum DevModType {
    NONE = "none",
    FULL_RELOAD = "full-reload",
    UI_REBUILD = "ui-rebuild"
}

function getDevModeType(): DevModType {
    let modFullReload = false;
    let modUiRebuild = false;

    //region Test jopi-dev

    let idx = process.argv.indexOf("--jopi-dev");

    if (idx!==-1) {
        process.argv.splice(idx, 1);
        modFullReload = true;
    }

    if (process.env.JOPI_DEV === "1") {
        modFullReload = true;
    }

    //endregion

    //region Test jopi-dev-ui

    idx = process.argv.indexOf("--jopi-dev-ui");

    if (idx!==-1) {
        process.argv.splice(idx, 1);
        modUiRebuild = true;
    }

    if (process.env.JOPI_DEV_UI === "1") {
        modUiRebuild = true;
    }

    //endregion

    if (modUiRebuild) return DevModType.UI_REBUILD;
    if (modFullReload) return DevModType.FULL_RELOAD;
    return DevModType.NONE;
}

export async function jopiLauncherTool(jsEngine: string) {
    function onSpawned() {
        // Nothing to do. Keep for future usages.
    }

    function addKnownPackages(toPreload: string[], toSearch: string[]) {
        if (!toSearch) return;

        for (const key in toSearch) {
            if (knowPackagesToPreload.includes(key)) {
                toPreload.push(key);
            }
        }
    }

    function getPreloadModules() {
        const packageJsonPath = jk_app.findPackageJson();

        if (!packageJsonPath) {
            return [];
        }

        try {
            const packageContent = fs.readFileSync(packageJsonPath, 'utf8');
            const packageData = JSON.parse(packageContent);

            let toPreload: string[] = [];

            let jopi = packageData.jopi;

            if (jopi && jopi.preload) {
                if (Array.isArray(jopi.preload)) {
                    toPreload = [...toPreload, ...jopi.preload];
                }
            }

            addKnownPackages(toPreload, packageData["devDependencies"]);
            addKnownPackages(toPreload, packageData["dependencies"]);

            return toPreload;

        } catch {
            // Ignore parsing errors and continue without preload modules.
            return [];
        }
    }

    async function getConfiguration(): Promise<WatchInfos> {
        let res: WatchInfos = {
            needUiWatch: gDevModeType === DevModType.UI_REBUILD,
            needWatch: gDevModeType === DevModType.FULL_RELOAD,
            needHot: (gDevModeType === DevModType.FULL_RELOAD) && (jsEngine==="bun")
        };

        let pckJson = jk_app.findPackageJson();

        if (pckJson) {
            if (mustLog) console.log("JopiN - package.json file found at", pckJson);

            res.packageJsonFilePath = pckJson;

            try {
                let json = JSON.parse(await jk_fs.readTextFromFile(pckJson));
                let jopi: any = json["jopi"];

                if (jopi) {
                    if (jopi.needUiWatch===true) {
                        res.needUiWatch = true;
                    }
                    else if (jopi.watch===true) {
                        res.needWatch = true;
                    }

                    if (jopi.hot===true) {
                        res.needHot = true;
                    }
                }

                if (json.scripts) {
                    let scripts = json.scripts;

                    if (scripts.jopiWatch) res.hasJopiWatchTask = true;
                    if (scripts.jopiWatch_node) res.hasJopiWatchTask_node = true;
                    if (scripts.jopiWatch_bun) res.hasJopiWatchTask_bun = true;
                }
            }
            catch (e) {
                console.error(e);
            }
        } else if (process.env.NODE_ENV !== 'production') {
            console.warn("JopiN - package.json not found, can't enable file watching");
        }

        let watch = process.env.WATCH;

        if (watch) {
            switch (watch) {
                case "0":
                case "false":
                case "no":
                    break;
                case "1":
                case "true":
                case "yes":
                    res.needWatch = true;
                    break;
                case "hot":
                    res.needWatch = true;
                    res.needHot = true;
                    break;
            }
        }

        return res;
    }

    const importFlag = jsEngine === "node" ? "--import" : "--preload";

    mustLog = process.env.JOPI_LOG==="1" || FORCE_LOG;

    if (mustLog) {
        console.log("JopiN Lib Version:", VERSION, " - engine:", jsEngine);
    }

    const knowPackagesToPreload = ["jopi-rewrite"];

    // Here first is node.js, second is jopi. (it's du to shebang usage).
    const argv = process.argv.slice(2);

    if (!argv.length) {
        console.log("jopi-loader "+ VERSION +" installed at ", import.meta.dirname);
        return;
    }

    let toPreload = getPreloadModules();
    toPreload = ["jopi-rewrite/loader", ...toPreload];

    let preloadArgs: string[] = [];

    toPreload.forEach(pkg => {
        preloadArgs.push(importFlag);
        preloadArgs.push(pkg);
    });

    if (jsEngine==="node") {
        preloadArgs.push("--loader", "jopi-rewrite/loader/loader.mjs");
        preloadArgs.push("--no-warnings");
    }

    let cmd = jk_os.whichSync(jsEngine, jsEngine)!;
    if (mustLog) console.log("jopiN - Using " + jsEngine + " from:", cmd);
    let args = [...preloadArgs, ...argv];

    let config = await getConfiguration();

    args = args.filter(arg => {
        if (arg === "--hot") {
            config.needHot = true;
            config.needWatch = true;
            return false;
        }

        if (arg === "--watch") {
            config.needHot = false;
            config.needWatch = true;
            return false;
        }

        return arg !== "--watch-path";
    });

    const cwd = process.cwd();
    let env: Record<string, string> = {...process.env} as Record<string, string>;

    if (config.needWatch || config.needUiWatch) {
        env["JOPIN_BROWSER_REFRESH_ENABLED"] = "1";
        if (config.needWatch) env["JOPI_DEV"] = "1";
        if (config.needUiWatch) env["JOPI_DEV_UI"] = "1";

        let toPrepend: string[] = [];

        if (config.needWatch) {
            if (config.needHot) toPrepend.push("--hot");
            else toPrepend.push("--watch");

            args = [...toPrepend, ...args];
            jk_term.logBlue("JopiN - Full source watching enabled.");
        }

        if (config.needUiWatch) {
            jk_term.logBlue("JopiN - UI source watching enabled.");
        }
    }

    if (mustLog) {
        console.log("jopiN - Use current working dir:", cwd);
        console.log("jopiN - Executing:", cmd, ...args);
    }

    let mainSpawnParams: SpawnParams =  {
        cmd, env, args, onSpawned, cwd: process.cwd(), killOnExit: false
    };

    spawnChild(mainSpawnParams);

    // If dev-mode, then execute the scripts
    // jopiWatch_node/jopiWatch_bun from package.json
    //
    if (gDevModeType === DevModType.FULL_RELOAD) {
        function execTask(taskName: string) {
            let cwd = path.dirname(config.packageJsonFilePath!);
            cmd = isNodeJs ? "npm" : "bun";
            spawnChild({cmd, env, cwd, args: ["run", taskName], killOnExit: false})
        }

        let isNodeJs = jsEngine == "node";
        if (config.hasJopiWatchTask) execTask("jopiWatch");
        if (isNodeJs && config.hasJopiWatchTask_node) execTask("jopiWatch_node");
        if (!isNodeJs && config.hasJopiWatchTask_bun) execTask("jopiWatch_bun");
    }
}

export interface SpawnParams {
    env?: Record<string, string>;
    cmd: string;
    args: string[];
    cwd: string;
    killOnExit: boolean;
    onSpawned?: (child: ChildProcess) => void;
}

function killAll(signalName: NodeJS.Signals) {
    gToKill.forEach(child => {
        if (child.killed) return;

        if (gDevModeType!==DevModType.NONE) {
            // > If dev-mode, directly do a fast hard kill.
            child.kill('SIGKILL');
            process.exit(0);
        } else {
            try {
                child.kill(signalName);
            }
            catch {
            }

            setTimeout(() => {
                if (!child.killed) {
                    child.kill('SIGKILL');
                }
            }, 1000);
        }
    });
}

function spawnChild(params: SpawnParams): void {
    let useShell = params.cmd.endsWith('.cmd') || params.cmd.endsWith('.bat') || params.cmd.endsWith('.sh');

    const child = spawn(params.cmd, params.args, {
        stdio: "inherit", shell: useShell,
        cwd: process.cwd(),
        env: params.env
    });

    gToKill.push(child);

    if (params.killOnExit) {
        child.on('exit', (code, signal) => {
            // The current instance has stopped?
            if (signal) process.kill(process.pid, signal);
            else process.exit(code ?? 0);
        });

        child.on('error', (err) => {
            // The current instance is in error?
            console.error(err.message || String(err));
            process.exit(1);
        });
    }

    if (params.onSpawned) {
        child.on('spawn', () => {
            params.onSpawned!(child);
        })
    }
}

// Allow a killing child process when this process exits.

process.on('SIGTERM', () => killAll("SIGTERM"));
process.on('SIGINT', () => killAll("SIGINT"));
process.on('SIGHUP', () => killAll("SIGHUP"));
process.on('exit', () => killAll("exit" as NodeJS.Signals));

const gDevModeType = getDevModeType();
const gToKill: ChildProcess[] = [];