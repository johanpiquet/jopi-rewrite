import {spawn} from "node:child_process";
import {esBuildBundle, type EsBuildParams} from "./esbuild.ts";

const FLAG = "--jopi-esbuild-hjky";

export async function launchEsBuildProcess(params: EsBuildParams) {
    //await launchEsBuildProcess_useSeparateProcess(params);
    await launchEsBuildProcess_direct(params);
}

export async function launchEsBuildProcess_direct(params: EsBuildParams) {
    process.env.JOPI_BUNLDER_ESBUILD = "1";

    try {
        await esBuildBundle(params);
    }
    finally {
        delete process.env.JOPI_BUNLDER_ESBUILD;
    }
}

/**
 * Launch EsBuild in a separate process.
 * Was require du to conflit with previous loader mechanisms.
 */
export async function launchEsBuildProcess_useSeparateProcess(params: EsBuildParams) {
    let thisFile = import.meta.filename;
    let jsonParams = JSON.stringify(params);

    let nodeOrBunPath = process.argv[0];
    const args = [thisFile, "--", FLAG, jsonParams];
    let useShell = nodeOrBunPath.endsWith('.cmd') || nodeOrBunPath.endsWith('.bat') || nodeOrBunPath.endsWith('.sh');

    const env = process.env;

    // Will allow this function to be really async.
    //
    return new Promise<void>((resolve, reject) => {
        const childProcess = spawn(
            nodeOrBunPath, args, {
                cwd: process.cwd(), 
                shell: useShell, 
                env, 
                stdio: 'inherit'
            }
        );

        childProcess.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                //reject(new Error(`Process exited with code ${code}`));
                resolve();
            }
        });

        childProcess.on('error', (error) => {
            //console.error(`Error when executing EsBuild:`, error);
            //reject(error);
            resolve();
        });
    });
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