import type {UiText} from "../helpers/tools";
import {type Schema} from "jopi-node-space/ns_schema";
import React from "react";

//region Core

export interface JFormComponentProps {
    schema: Schema;
    action?: string;
}

export interface JFieldController {
    name: string;
    error: boolean;
    errorMessage?: string;

    title?: string;
    description?: string;

    value: any;
    oldValue: any;

    onChange: (value: any) => void;
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
    variant?: React.FC<unknown>;
}

export interface InputFormFieldProps extends JFieldProps {
    id?: string;
    className?: string;
    placeholder?: string;
}

export interface CheckboxFormFieldProps extends JFieldProps {
    id?: string,
    className?: string,
    defaultChecked?: boolean,
}

//endregion