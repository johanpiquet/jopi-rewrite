// noinspection JSUnusedGlobalSymbols

import React, {useRef} from "react";
import {useVariant, VariantContext} from "../variants/index.tsx";
import {
    type CheckboxFormFieldProps,
    type InputFormFieldProps,
    type JFormComponentProps,
    type JFormController
} from "./interfaces.ts";
import {FormContext, JFormControllerImpl} from "./private.ts";
import {useJForm} from "./hooks.ts";

export function JForm({children, className, variants, ...p}: { children: React.ReactNode, className?: string, variants?: any } & JFormComponentProps)
{
    const ref = useRef<JFormControllerImpl>(new JFormControllerImpl(p));

    const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        let toSubmit = ref.current.validate();
        if (toSubmit === undefined) setMessage("Form is not valid.");
        else setMessage("Submitting form to " + toSubmit);
    };

    const [message, setMessage] = React.useState<string>("");

    return <FormContext.Provider value={ref.current}>
        <VariantContext.Provider value={variants}>
            <form className={className} onSubmit={onSubmit}>{message}{children}</form>
        </VariantContext.Provider>
    </FormContext.Provider>
}

export function JFormStateListener({custom, ifSubmitted, ifNotSubmitted}: {
    ifSubmitted?: React.ReactNode,
    ifNotSubmitted?: React.ReactNode,
    custom?: (form: JFormController) => React.ReactNode
}) {
    const form = useJForm();

    if (form.submitted) {
        if (ifSubmitted) return ifSubmitted;
    } else {
        if (ifNotSubmitted) return ifNotSubmitted;
    }

    return custom?.(form);
}

export function InputFormField({variant, ...p}: InputFormFieldProps) {
    const V = useVariant("InputFormField", variant);
    return <V {...p}/>;
}

//region CheckboxFormField

export function CheckboxFormField({variant, ...p}: CheckboxFormFieldProps) {
    const V = useVariant("CheckboxFormField", variant);
    return <V {...p}/>;
}

//endregion