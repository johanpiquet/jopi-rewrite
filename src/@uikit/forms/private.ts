import React from "react";
import * as ns_schema from "jopi-node-space/ns_schema";
import type {JFieldController, JFormComponentProps, JFormController} from "./interfaces.ts";

type Listener = () => void;

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

export class JFormControllerImpl implements JFormController {
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

export const FormContext = React.createContext<JFormController>(undefined as unknown as JFormController);

