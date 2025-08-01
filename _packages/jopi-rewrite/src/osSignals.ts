export type ApplicationExitHandler = ()=>void|Promise<void>;

const listeners: ApplicationExitHandler[] = [];

export function onApplicationExit(handler: ApplicationExitHandler) {
    if (listeners.includes(handler)) return;
    listeners.push(handler);
}

let gIsExiting = false;

async function declareApplicationExit() {
    if (gIsExiting) return;
    gIsExiting = true;

    await Promise.all(listeners.map(l => {
        try {
            return l();
        }
        catch (e) {
            // Avoid error to stop cleaning.
            console.error(e);
        }
    }));
}

export function startApplication(app: () => void|Promise<void>) {
    async function exec() {
        try {
            const res = app();
            if (res instanceof Promise) await res;
        }
        catch (e) {
            console.error(e);
        }
    }

    exec().then(declareApplicationExit);
}

process.on('SIGINT', declareApplicationExit);