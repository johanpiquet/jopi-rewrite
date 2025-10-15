// noinspection JSUnusedGlobalSymbols

import React, {useRef} from "react";
import {getVariantProvider, type WithVariant} from "jopi-rewrite/ui";
import {type JFieldProps, type JFormComponentProps, type JFormController} from "./interfaces.ts";
import {FormContext, JFormControllerImpl} from "./private.ts";
import {useJForm} from "./hooks.ts";

export function JForm({children, className, ...p}: { children: React.ReactNode, className?: string } & JFormComponentProps)
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
        <form className={className} onSubmit={onSubmit}>{message}{children}</form>
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

//region InputFormField

export const VariantId_InputFormField = "d3ff0685-5398-47be-8f5f-8b9ef3121ffd";
const V_InputFormField = getVariantProvider(VariantId_InputFormField);

export interface InputFormFieldProps extends JFieldProps {
    id?: string,
    className?: string,
    placeholder?: string
}

export function InputFormField({variant, ...p}: WithVariant<InputFormFieldProps>) {
    const C = V_InputFormField.get(variant);
    return <C {...p}/>;
}

//endregion

//region CheckboxFormField

export const VariantId_CheckboxFormField = "90c93770-4dac-49f2-a7dd-20cfe10b1b87";
const V_CheckboxFormField = getVariantProvider(VariantId_CheckboxFormField);

export interface CheckboxFormFieldProps extends JFieldProps {
    id?: string,
    className?: string,
    defaultChecked?: boolean,
}

export function CheckboxFormField({variant, ...p}: WithVariant<CheckboxFormFieldProps>) {
    const C = V_CheckboxFormField.get(variant);
    return <C {...p}/>;
}

//endregion