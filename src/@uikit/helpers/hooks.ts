// noinspection JSUnusedGlobalSymbols

import React, {useEffect, useState} from "react";

import {isServerSide} from "jopi-node-space/ns_what";
import {useEvent, useServerRequest} from "jopi-rewrite/ui";

/**
 * Allow refreshing the React component.
 */
export function useRefresh() {
    const [_, setCount] = useState(0);
    return () => setCount(old => old + 1);
}

/**
 * Execute the function only one time per React component.
 * Which means that if this function is called elsewhere with useExecuteOnce
 * then it will be executed again.
 *
 * @param f
 *      The function to call.
 *
 * @param key
 *      A key which is used server side in order to make the call unique.
 *      If undefined, then a key is calculated. Providing our own key
 *      allow making things a little faster, since calculating an uniq
 *      key require parsing a call-stack.
 */
export function useExecuteOnce(f: () => void, key?: string) {
    function calcCallerKey(): string {
        if (key) return key;
        const stack = new Error().stack;

        // Will return the name of the file and his position in the file.
        // This will act as a uniq key.
        //
        return stack?.split('\n')[3]?.trim() || Math.random().toString();
    }

    if (isServerSide) {
        let serverRequest = useServerRequest();

        // A key identifying the caller.
        let key = calcCallerKey();

        // Will allows to store keys already processed.
        let asSet = serverRequest.customData.jopiUseExecuteOnce as Set<string>;

        if (!asSet) {
            serverRequest.customData.jopiUseExecuteOnce = asSet = new Set<string>();
            asSet.add(key);
            f();
        } else {
            if (!asSet.has(key)) {
                asSet.add(key);
                f();
            }
        }
    } else {
        const executedRef = React.useRef(false);

        useEffect(() => {
            if (!executedRef.current) {
                executedRef.current = true;
                f();
            }
        }, []);
    }
}

export function useRefreshOnEvent(evenName: string|string[]) {
    const [_, setCounter] = useState(0);
    useEvent(evenName, () => { setCounter(prev => prev + 1) });
}

export function useEventValue<T = any>(evenName: string|string[]): T|undefined {
    const [value, setValue] = useState<T|undefined>(undefined);
    useEvent(evenName, (data) => { setValue(data) });
    return value;
}