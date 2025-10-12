import type {UiText} from "./publicTools.js";
import {getVariantProvider, type WithVariant} from "jopi-rewrite-ui";
import React, {useContext, useRef} from "react";
import * as ns_schema from "jopi-node-space/ns_schema";

export interface FieldProps {
    name: string,
    title?: UiText,
    description?: UiText
}

//region Engine

export interface JFormProps {
    schema: ns_schema.Schema;
    action?: string;
}

export interface JFieldState {
    formItemId: string;
    error: boolean;
    errorMessage?: string;

    title?: string;
    description?: string;

    value: any;
    oldValue: any;

    onChange: (value: any) => void;
}

interface JFieldState_Internal extends JFieldState {
    listener?: () => void;
}

export interface FieldDef {
    title: string;
    description?: string;
    type: string;
    default?: any;
}

class JFormInstance {
    private readonly fields: Record<string, JFieldState_Internal> = {};
    private readonly allFieldDef: Record<string, FieldDef>;

    constructor(private props: JFormProps) {
        let asJson = ns_schema.toJson(this.props.schema);
        this.allFieldDef = asJson.properties as Record<string, FieldDef>;
    }

    validate(): string | undefined {
        let data: any = {};

        for (let name in this.fields) {
            data[name] = this.fields[name].value;
        }

        console.log("Validating form data:", data);

        for (let field of Object.values(this.fields)) {
            field.error = false;
            field.errorMessage = undefined;
        }

        const res = this.props.schema.safeParse(data);

        if (!res.success) {
            res.error.issues.forEach(issue => {
                let fieldName = issue.path[0] as string;
                let fieldRef = this.getField(fieldName);
                fieldRef.error = true;
                fieldRef.errorMessage = issue.message;
            })
        }

        for (let field of Object.values(this.fields)) {
            if (field.listener) field.listener();
        }

        return res.success ? this.props.action || window.location.href : undefined;
    }

    getField(name: string): JFieldState_Internal {
        let field: JFieldState_Internal = this.fields[name];
        if (field) return field;

        const fieldDef = this.allFieldDef[name];

        this.fields[name] = field = {
            formItemId: name,
            error: false,
            value: fieldDef && fieldDef.default ? fieldDef.default : calcDefault(fieldDef),
            oldValue: undefined,

            onChange: (value: any) => {
                if (value===field.value) return;

                field.oldValue = field.value;
                field.value = value;

                if (field.listener) field.listener();
            },

            ...fieldDef
        };

        return field;
    }
}

function calcDefault(fieldDef: FieldDef|undefined): any {
    if (!fieldDef) return undefined;

    if (fieldDef.type === "string") return "";
    if (fieldDef.type === "number") return 0;
    if (fieldDef.type === "boolean") return false;
    if (fieldDef.type === "object") return {};
    if (fieldDef.type === "array") return [];
    return undefined;
}

const FormContext = React.createContext<JFormInstance>(undefined as unknown as JFormInstance);

export function useJForm(): JFormInstance {
    const form = useContext(FormContext);
    if (!form) throw new Error("useJForm must be used within a JForm component.");
    return form;
}

export function useJFormField(name: string): JFieldState {
    const [counter, setCounter] = React.useState(0);

    const form = useJForm();
    let thisField = form.getField(name);
    thisField.listener = () => { setCounter(counter+1) };

    return thisField;
}

export function JForm({children, className, ...p}: { children: React.ReactNode, className?: string } & JFormProps) {
    const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        let toSubmit = ref.current.validate();

        if (toSubmit===undefined) {
            setMessage("Form is not valid.");

        } else {
            setMessage("Submitting form to " + toSubmit);
        }

        setCounter(counter+1);
    };

    const ref = useRef<JFormInstance>(new JFormInstance(p));
    const [counter, setCounter] = React.useState(0);
    const [message, setMessage] = React.useState<string>("");

    return <FormContext.Provider value={ref.current}>
        {message}
        <form className={className} onSubmit={onSubmit}>
            {children}
        </form>
    </FormContext.Provider>
}

//endregion

//region InputFormField

export const VariantId_InputFormField = "d3ff0685-5398-47be-8f5f-8b9ef3121ffd";
const V_InputFormField = getVariantProvider(VariantId_InputFormField);

export interface InputFormFieldProps extends FieldProps {
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

export interface CheckboxFormFieldProps extends FieldProps {
    id?: string,
    className?: string,
    defaultChecked?: boolean,
}

export function CheckboxFormField({variant, ...p}: WithVariant<CheckboxFormFieldProps>) {
    const C = V_CheckboxFormField.get(variant);
    return <C {...p}/>;
}

//endregion