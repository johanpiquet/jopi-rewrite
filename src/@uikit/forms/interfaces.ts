import type {UiText} from "../helpers/tools";
import {type Schema} from "jopi-node-space/ns_schema";
import React from "react";

//region Core

export interface JFormComponentProps {
    schema: Schema;
    action?: string;
}

export interface JFieldController {
    form: JFormController;

    name: string;
    error: boolean;
    errorMessage?: string;

    title?: string;
    description?: string;
    placeholder?: string;

    value: any;
    valueConverter: (value: any, isTyping: boolean) => any;

    oldValue: any;

    onChange: (value: any) => void;

    variantName: string;
}

export interface JFormController {
    error: boolean;
    submitted: boolean;

    validate(): string | undefined;
    check(): boolean;
}

//endregion

//region By type

export interface JFieldProps {
    name: string;
    title?: UiText;
    description?: UiText;
    placeholder?: string;

    variant?: React.FC<unknown>;

    id?: string;
    className?: string;
}

export interface InputFormFieldProps extends JFieldProps {
}

export interface CheckboxFormFieldProps extends JFieldProps {
    defaultChecked?: boolean;
}

export interface NumberFormFieldProps extends JFieldProps {
    minValue?: number;
    maxValue?: number;
    incrStep?: number;
}

export interface AutoFormFieldProps extends InputFormFieldProps, CheckboxFormFieldProps, NumberFormFieldProps {
}

//endregion