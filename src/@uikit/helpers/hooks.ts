// noinspection JSUnusedGlobalSymbols

import React, {useEffect, useState} from "react";

import {isServerSide} from "jopi-toolkit/ns_what";
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

export function useEventValue<T = any>(evenName: string|string[], defaultProvider?: T | (() => T)): T|undefined {
    const [value, setValue] = useState<T|undefined>(defaultProvider);

    useEvent(evenName, (data) => {
        setValue(data)
    });

    return value;
}

/**
 * Allow submitting a form.
 *
 * @param onFormReturns
 *      A function which is called when the form call returns positively.
 * @param url
 *      An optional url to url.
 * @returns
 *      Return an array of two elements:
 *          - Set function allowing to submit the form.
 *            It takes in arg the event sent by Form.onSubmit
 *          - Set value of the form, or undefined if not submit.
 */
export function useFormSubmit<T = any>(onFormReturns?: (data: T) => void, url?: string): UseFormSubmitResponse<T> {
    if (isServerSide) {
        return [() => {}, undefined, false]
    }

    const [state, setState] = useState<T|undefined>(undefined);
    const [isSending, setIsSending] = useState(false);

    async function f(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        url = url || window.location.href;

        const formData = new FormData(e.currentTarget);
        setIsSending(true);

        try {
            const response = await fetch(url!, {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });

            if (response.ok) {
                let v = await response.json() as T;
                setState(v);
                if (onFormReturns) onFormReturns(v);
            } else {
                console.error("useFormSubmit - Not 200 response", response);
            }
        } catch (e) {
            console.error("useFormSubmit - Network error", e);
        }
        finally {
            setIsSending(false);
        }
    }

    return [f, state, isSending];
}
//
type UseFormSubmitResponse<T> = [
    (e: React.FormEvent<HTMLFormElement>) => void,
        T | undefined,
    boolean
];

export function useSendJsonData<T = any>(onFormReturns?: (data: T) => void, url?: string): UseSendPostDataResponse<T> {
    if (isServerSide) {
        return [() => {}, undefined, false]
    }

    const [state, setState] = useState<T|undefined>(undefined);
    const [isSending, setIsSending] = useState(false);

    async function f(data: T) {
        url = url || window.location.href;

        try {
            setIsSending(true);

            const response = await fetch(url!, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(data),
                credentials: 'include'
            });

            if (response.ok) {
                let v = await response.json() as T;
                setState(v);
                if (onFormReturns) onFormReturns(v);
            } else {
                console.error("useSendPostData - Not 200 response", response);
            }
        } catch (e) {
            console.error("useSendPostData - Network error", e);
        }
        finally {
            setIsSending(false);
        }
    }

    return [f, state, isSending];
}
//
type UseSendPostDataResponse<T> = [
    (data: T) => void
    , T | undefined,
    boolean
];