import {createRequire} from "node:module";

const VERSION = "2.0.0";

export function useEngine(engine: string) {
    const myRequire = createRequire(process.cwd());

    if (process.env.JOPI_LOG==="1") {
        let resolvedDir = myRequire.resolve("jopi-rewrite/loader-tools");
        console.log("JopiN - jopi-rewrite/loader-tools found at " + resolvedDir);
        console.log("JopiN - Loader Version" + VERSION + " - engine=" + engine);
    }

    const lib = myRequire("jopi-rewrite/loader-tools");
    lib.jopiLauncherTool(engine).then();
}
