// noinspection JSUnusedGlobalSymbols

import React, {useRef} from "react";
import {useVariant, VariantContext} from "../variants/index.tsx";
import {
    type AutoFormFieldProps,
    type CheckboxFormFieldProps,
    type InputFormFieldProps, type JFieldProps,
    type JFormComponentProps,
    type JFormController, type NumberFormFieldProps
} from "./interfaces.ts";
import {FormContext, JFormControllerImpl} from "./private.ts";
import {useJForm, useJFormField} from "./hooks.ts";

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

function renderField(variantName: string|undefined, p: JFieldProps) {
    const field = useJFormField(p.name);

    p = {...p};
    if (p.title===undefined) p.title = field.title;
    if (p.description===undefined) p.description = field.description;
    if (p.placeholder===undefined) p.placeholder = field.placeholder;

    if (!variantName) {
        variantName = field.variantName;
    }

    const V = useVariant(variantName, p.variant);
    return <V {...p} field={field} />;
}

export function AutoFormField({variant, ...p}: AutoFormFieldProps) {
    return renderField(undefined, p);
}

//region Form Types

export function TextFormField({variant, ...p}: InputFormFieldProps) {
    return renderField("TextFormField", p);
}

export function NumberFormField({variant, ...p}: NumberFormFieldProps) {
    return renderField("NumberFormField", p);
}

export function CheckboxFormField({variant, ...p}: CheckboxFormFieldProps) {
    return renderField("CheckboxFormField", p);
}

//endregion