import React, {useContext, useEffect, useState} from "react";
import type {JFieldController, JFormController} from "./interfaces.ts";
import {FormContext, JFormControllerImpl} from "./private.ts";
import {isServerSide} from "jopi-node-space/ns_what";

export function useJForm(): JFormController {
    const theForm = useContext(FormContext) as JFormControllerImpl;
    if (!theForm) throw new Error("useJForm must be used within a JForm component.");

    const [_, setCounter] = React.useState(0);

    useEffect(() => {
        function eventHandler() {
            // Here use prevCount to always have the update counter value.
            setCounter(prevCount => prevCount+1);
        }

        theForm.addStateChangeListener(eventHandler);
        return () => { theForm.removeStateChangeListener(eventHandler) };
    }, []);

    return theForm;
}

export function useJFormField(name: string): JFieldController {
    const [_, setCounter] = React.useState(0);

    const form = useJForm() as JFormControllerImpl;
    let thisField = form.getField(name);
    thisField.onStateChange = () => { setCounter(prev => prev + 1) };

    return thisField;
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