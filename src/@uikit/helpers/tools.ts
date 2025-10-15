import React from "react";

export type UiText = string | React.ReactNode;

export function ucFirst(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
}
