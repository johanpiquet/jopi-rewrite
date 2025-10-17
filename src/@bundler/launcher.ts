import {spawn} from "node:child_process";
import {esBuildBundle, type EsBuildParams} from "./esbuild.ts";

const FLAG = "--jopi-esbuild-hjky";

export async function launchEsBuildProcess(params: EsBuildParams) {
    process.env.JOPI_BUNLDER_ESBUILD = "1";

    try {
        await esBuildBundle(params);
    }
    finally {
        delete process.env.JOPI_BUNLDER_ESBUILD;
    }
}

// The current version of Node.js doesn't support "import.meta.main".
// It's why we need this special flag.
//
if (process.argv.includes(FLAG)) {
    async function bundle() {
        process.env.JOPI_BUNLDER_ESBUILD = "1";

        let jsonEncoded = process.argv[process.argv.indexOf(FLAG) + 1];
        let config = JSON.parse(jsonEncoded) as EsBuildParams;
        await esBuildBundle(config);
    }

    bundle().then();
}