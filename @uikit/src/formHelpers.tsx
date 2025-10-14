import type {UiText} from "./publicTools.js";
import {getVariantProvider, type WithVariant} from "jopi-rewrite-ui";
import React, {useContext, useEffect, useRef} from "react";
import * as ns_schema from "jopi-node-space/ns_schema";

export interface FieldProps {
    name: string,
    title?: UiText,
    description?: UiText
}

//region Engine

export interface JFormComponentProps {
    schema: ns_schema.Schema;
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

interface JFieldController_Private extends JFieldController {
    onStateChange?: () => void;
}

/**
 * Information about the field coming
 * from ZObject converted to JSON.
 */
interface JsonFieldDef {
    title: string;
    description?: string;
    type: string;
    default?: any;
}

type Listener = () => void;

class JFormControllerImpl implements JFormController {
    private readonly fields: Record<string, JFieldController_Private> = {};
    private readonly allFieldDef: Record<string, JsonFieldDef>;
    private readonly onStateChange: Listener[] = [];

    submitted = false;
    error = false;

    private autoRevalidate = false;

    constructor(private props: JFormComponentProps) {
        let asJson = ns_schema.toJson(this.props.schema);
        this.allFieldDef = asJson.properties as Record<string, JsonFieldDef>;
    }

    validate(): string | undefined {
        this.autoRevalidate = true;

        if (this.check()) {
            this.declareStateChange(true, false);
            return this.props.action || window.location.href;
        } else {
            return undefined;
        }
    }

    check(): boolean {
        let data: any = {};

        for (let name in this.fields) {
            data[name] = this.fields[name].value;
        }

        for (let field of Object.values(this.fields)) {
            field.error = false;
            field.errorMessage = undefined;
        }

        const res = this.props.schema.safeParse(data);

        if (res.success) {
            this.declareStateChange(this.submitted, false);
        }
        else {
            res.error.issues.forEach(issue => {
                let fieldName = issue.path[0] as string;
                let fieldRef = this.getField(fieldName);
                fieldRef.error = true;
                fieldRef.errorMessage = issue.message;
            });

            this.declareStateChange(this.submitted, true);
        }

        for (let field of Object.values(this.fields)) {
            field.onStateChange?.();
        }

        return res.success;
    }

    getField(name: string): JFieldController_Private {
        let field: JFieldController_Private = this.fields[name];
        if (field) return field;

        const fieldDef = this.allFieldDef[name];
        const form = this;

        this.fields[name] = field = {
            name: name,
            error: false,
            value: fieldDef && fieldDef.default ? fieldDef.default : calcDefault(fieldDef),
            oldValue: undefined,

            onChange: (value: any) => {
                if (value===field.value) return;

                field.oldValue = field.value;
                field.value = value;

                if (form.autoRevalidate) form.check();
                else if (field.onStateChange) {
                    field.onStateChange();
                }
            },

            ...fieldDef
        };

        return field;
    }

    private declareStateChange(isSubmitted: boolean, isError: boolean) {
        //if (this.submitted === isSubmitted && this.error === isError) return;

        console.log("declareStateChange", isSubmitted, isError, "listener count: ", this.onStateChange.length);

        this.submitted = isSubmitted;
        this.error = isError;
        this.onStateChange.forEach(l => l());
    }

    addStateChangeListener(l: () => void) {
        if (!this.onStateChange.includes(l)) {
            this.onStateChange.push(l);
        }
    }

    removeStateChangeListener(l: () => void) {
        let idx = this.onStateChange.indexOf(l);
        if (idx!==-1) this.onStateChange.splice(idx, 1);
    }
}

function calcDefault(fieldDef: JsonFieldDef|undefined): any {
    if (!fieldDef) return undefined;

    if (fieldDef.type === "string") return "";
    if (fieldDef.type === "number") return 0;
    if (fieldDef.type === "boolean") return false;
    if (fieldDef.type === "object") return {};
    if (fieldDef.type === "array") return [];
    return undefined;
}

const FormContext = React.createContext<JFormController>(undefined as unknown as JFormController);

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

export function JFormStateListener(
    {custom, ifSubmitted, ifNotSubmitted}: {
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