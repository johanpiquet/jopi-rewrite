import type {UiText} from "./publicTools.js";
import {getVariantProvider, type WithVariant} from "jopi-rewrite-ui";

//region InputFormField

export const VariantId_InputFormField = "d3ff0685-5398-47be-8f5f-8b9ef3121ffd";
const V_InputFormField = getVariantProvider(VariantId_InputFormField);

export interface InputFormFieldProps {
    name: string,

    id?: string,
    className?: string,

    label?: UiText,
    description?: UiText,
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

export interface CheckboxFormFieldProps {
    name: string,
    label: UiText,

    id?: string,
    className?: string,
    containerClassName?: string,
    labelClassName?: string,
    descriptionClassName?: string,

    defaultChecked?: boolean,
    description?: UiText
}

export function CheckboxFormField({variant, ...p}: WithVariant<CheckboxFormFieldProps>) {
    const C = V_CheckboxFormField.get(variant);
    return <C {...p}/>;
}

//endregion