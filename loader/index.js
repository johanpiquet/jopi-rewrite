import { registerHooks } from 'node:module';

const ignoredExtensions = ['.css', '.scss'];

// Doing this allow executing in the same thread.
// It's a requirement because we are using esbuild and we need to be able to disable our plugin when es-build is running.
// Doc: https://nodejs.org/download/release/v22.15.1/docs/api/module.html#customization-hooks
//
registerHooks({
    resolve(specifier, context, nextResolve) {
        if (globalThis.esBuildIsRunning) {
            return nextResolve(specifier, context);
        }

        if (ignoredExtensions.some(ext => specifier.endsWith(ext))) {
            return {
                url: new URL(specifier, context.parentURL).href,
                format: 'jopi-loader',
                shortCircuit: true
            };
        }

        return nextResolve(specifier, context);
    },

    load(url, context, nextLoad) {
        if (globalThis.esBuildIsRunning) {
            return nextLoad(url, context);
        }

        if (context.format === 'jopi-loader') {
            console.log("jopi-loader-loader ignored: ", url)
            return {
                source: 'export default {};',
                format: 'module',
                shortCircuit: true
            };
        }

        return nextLoad(url, context);
    }
});