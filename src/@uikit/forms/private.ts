import React from "react";
import * as ns_schema from "jopi-node-space/ns_schema";
import type {
    JFormSubmitMessage,
    JFieldController,
    JFormComponentProps,
    JFormController,
    SubmitFunction
} from "./interfaces.ts";
import type {ValidationErrors} from "jopi-node-space/ns_schema";

type Listener = () => void;

export const FormContext = React.createContext<JFormController>(undefined as unknown as JFormController);

interface JFieldController_Private extends JFieldController {
    onStateChange?: () => void;
}

export class JFormControllerImpl implements JFormController {
    private readonly fields: Record<string, JFieldController_Private> = {};
    private readonly jsonSchema: ns_schema.SchemaDescriptor;
    private readonly onStateChange: Listener[] = [];

    private readonly submitHandler?: SubmitFunction;

    submitted = false;
    error = false;
    submitMessage?: JFormSubmitMessage;

    private autoRevalidate = false;

    constructor(private props: JFormComponentProps) {
        this.jsonSchema = ns_schema.toJson(this.props.schema).desc;
        this.submitHandler = props.submit;
    }

    getData<T = any>(): T {
        let data: any = {};

        for (let name in this.fields) {
            let field = this.fields[name];
            data[name] = field.valueConverter(field.value, false);
        }

        return data as T;
    }

    getSubmitUrl(): string {
        return this.props.action || window.location.href
    }

    private setFormMessage(message: JFormSubmitMessage): JFormSubmitMessage {
        this.submitMessage = message;

        if (message.isSubmitted) {
            this.declareStateChange(true, false);
        } else {
            this.declareStateChange(false, !message.isOk);
        }

        return message;
    }

    async submit(): Promise<JFormSubmitMessage|undefined> {
        this.autoRevalidate = true;
        let data = this.getData();
        let fieldErrors = this.validateAux(data);

        if (fieldErrors) {
            return this.setFormMessage({isOk: false, isSubmitted: false, fieldErrors});
        }

        if (this.submitHandler) {
            try {
                let r = this.submitHandler({data, form: this});
                if (r instanceof Promise) r = await r;
                if (r) return this.setFormMessage(r);
            } catch (e) {
                console.error("Error when submitting form:", e);

                return this.setFormMessage({
                    isOk: false,
                    isSubmitted: false,
                    message: "An error occurred when submitting form",
                    code: "UNKNOWN_SUBMIT_ERROR"
                });
            }

            return this.setFormMessage({isOk: true, isSubmitted: true});
        }

        return this.setFormMessage({isOk: true, isSubmitted: false});
    }

    validate(): ValidationErrors | undefined {
        return this.validateAux(this.getData());
    }

    private validateAux(data: any): ValidationErrors | undefined {
        for (let field of Object.values(this.fields)) {
            field.error = false;
            field.errorMessage = undefined;
        }

        const errors = ns_schema.validateSchema(data, this.props.schema);

        if (errors) {
            if (errors.fields) {
                for (let fieldError of Object.values(errors.fields)) {
                    let fieldRef = this.getField(fieldError.fieldName);
                    fieldRef.error = true;
                    fieldRef.errorMessage = fieldError.message;
                }
            }

            this.declareStateChange(this.submitted, true);
        } else {
            this.declareStateChange(this.submitted, false);
        }

        for (let field of Object.values(this.fields)) {
            field.onStateChange?.();
        }

        return errors;
    }

    getField(name: string): JFieldController_Private {
        let field: JFieldController_Private = this.fields[name];
        if (field) return field;

        const fieldDef = this.jsonSchema[name];
        const form = this;

        const valueConverter = selectValueConverter(fieldDef.type);

        this.fields[name] = field = {
            form: this,
            variantName: getVariantName(fieldDef.type),

            name: name,
            error: false,

            valueConverter,
            value: fieldDef && fieldDef.default ? fieldDef.default : calcDefault(fieldDef),

            oldValue: undefined,

            onChange: (value: any) => {
                if (value!==undefined) value = valueConverter(value, true);
                if (value===field.value) return;

                field.oldValue = field.value;
                field.value = value;

                if (form.autoRevalidate) form.validate();
                else if (field.onStateChange) {
                    field.onStateChange();
                }
            },

            ...fieldDef
        };

        return field;
    }

    private declareStateChange(isSubmitted: boolean, isError: boolean) {
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

function calcDefault(fieldDef: ns_schema.SchemaFieldInfos|undefined): any {
    if (!fieldDef) return undefined;

    if (fieldDef.type === "string") return "";
    if (fieldDef.type === "number") return undefined;
    if (fieldDef.type === "boolean") return false;
    if (fieldDef.type === "object") return {};
    if (fieldDef.type === "array") return [];
    return undefined;
}

function getVariantName(fieldType: string): string {
    switch (fieldType) {
        case "string": return "TextFormField";
        case "number": return "NumberFormField";
        case "boolean": return "CheckboxFormField";
    }

    return "TextFormField";
}

function selectValueConverter(fieldType: string): ((v: any, isTyping: boolean) => any) {
    switch (fieldType) {
        case "string": return (v: any) => {
            return String(v);
        }

        case "number": return (v: any, isTyping: boolean) => {
            if (!isTyping) {
                if (v===undefined) return undefined;
                v = String(v).trim().replaceAll(",", ".");
                if (v === "") return undefined;
            }
            else {
                v = String(v).trim().replaceAll(",", ".");
            }

            let asNumber = Number(v);

            // Must avoid blocking if doing something like "+5,3"

            // Let it return a string.
            // Will send an error of the type "number is required".
            //
            if (isNaN(asNumber)) return v;

            if (v==="") return undefined;
            return asNumber;
        }

        case "boolean":  return (v: any) => {
            return Boolean(v);
        }
    }

    return (v: any) => v;
}
