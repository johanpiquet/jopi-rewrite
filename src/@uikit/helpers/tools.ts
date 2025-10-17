import React from "react";

export type UiText = string | React.ReactNode;

export function ucFirst(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
}

export function IfTrue(cond: any, value: React.ReactNode) {
    if (cond) return value;
    return null;
}

export function UseIfDefined(value: any) {
    if (value) return value;
    return null;
}

export function IfFalse(cond: any, value: React.ReactNode) {
    if (!cond) return value;
    return null;
}

export async function sendFormData(url: string, formData: FormData): Promise<Response> {
    return await fetch(url!, {
        method: 'POST',
        body: formData,
        credentials: 'include'
    });
}