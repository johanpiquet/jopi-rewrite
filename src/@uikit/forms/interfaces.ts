import type {UiText} from "../helpers/tools";
import * as ns_schema from "jopi-node-space/ns_schema";

export interface JFieldProps {
    name: string,
    title?: UiText,
    description?: UiText
}

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