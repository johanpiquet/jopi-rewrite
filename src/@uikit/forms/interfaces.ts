import type {UiText} from "../helpers/tools";
import {type Schema, type ValidationErrors} from "jopi-node-space/ns_schema";
import React from "react";

//region Core

export type SubmitFunction = (params: { data: any, form: JFormController, hasFiles: boolean })
                              => Promise<JFormSubmitMessage|undefined|void> | JFormSubmitMessage | undefined | void;

export interface JFormComponentProps {
    schema: Schema;
    action?: string;
    submit?: SubmitFunction
}

export interface JFieldController {
    form: JFormController;

    name: string;
    type: string;

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
    submitMessage?: JFormSubmitMessage;

    getData<T = any>(): T;
    getFormData(): FormData;
    getSubmitUrl(): string;
}

export interface JFormSubmitMessage {
    isOk: boolean;
    isSubmitted: boolean;

    message?: string;
    code?: string;

    fieldErrors?: ValidationErrors;
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

export interface JFormMessageProps {
    id?: string;
    className?: string;
    variant?: React.FC<unknown>;
    isBefore?: boolean;
    message?: JFormSubmitMessage;

    errorMessage?: UiText;

    // false: allows hiding the submitted message.
    submittedMessage?: UiText|false;

    // false: allows hiding the message if field errors.
    fieldErrorMessage?: UiText|false;
}

export interface JInputFormFieldProps extends JFieldProps {
}

export interface JCheckboxFormFieldProps extends JFieldProps {
    defaultChecked?: boolean;
}
export interface JFileSelectFieldProps extends JFieldProps {
}

export interface JNumberFormFieldProps extends JFieldProps {
    minValue?: number;
    maxValue?: number;
    incrStep?: number;
}

export interface JAutoFormFieldProps extends JInputFormFieldProps, JCheckboxFormFieldProps, JNumberFormFieldProps {
}

//endregion