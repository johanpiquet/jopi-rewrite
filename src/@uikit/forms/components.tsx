// noinspection JSUnusedGlobalSymbols

import React, {useRef} from "react";
import {useVariant, VariantContext} from "../variants/index.tsx";
import {
    type JAutoFormFieldProps,
    type JCheckboxFormFieldProps, type JFormMessageProps, type JFormSubmitMessage,
    type JInputFormFieldProps, type JFieldProps,
    type JFormComponentProps,
    type JFormController, type JNumberFormFieldProps
} from "./interfaces.ts";
import {FormContext, JFormControllerImpl} from "./private.ts";
import {useJForm, useJFormField, useJFormSubmitMessage} from "./hooks.ts";

export function JForm({children, className, variants, ...p}: JFormComponentProps & {
    children: React.ReactNode, className?: string, variants?: any
})
{
    const ref = useRef<JFormControllerImpl>(new JFormControllerImpl(p));

    const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        await ref.current.submit();
    };

    return <FormContext.Provider value={ref.current}>
        <VariantContext.Provider value={variants}>
            <form className={className} onSubmit={onSubmit}>{children}</form>
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

export function JAutoFormField({variant, ...p}: JAutoFormFieldProps) {
    return renderField(undefined, p);
}

//region Form Types

export function JFormMessage(p: JFormMessageProps) {
    const message = useJFormSubmitMessage();
    if (!message) return null;

    const V = useVariant("FormMessage", p.variant);
    return <V {...p} message={message} />;
}

export function JTextFormField({variant, ...p}: JInputFormFieldProps) {
    return renderField("TextFormField", p);
}

export function JNumberFormField({variant, ...p}: JNumberFormFieldProps) {
    return renderField("NumberFormField", p);
}

export function JCheckboxFormField({variant, ...p}: JCheckboxFormFieldProps) {
    return renderField("CheckboxFormField", p);
}

//endregion