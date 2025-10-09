import type {Config as TailwindConfig} from 'tailwindcss';
import postcss from 'postcss';

export type PostCssInitializer = (sources: string[], tailwindPlugin:  postcss.AcceptedPlugin|undefined) => postcss.AcceptedPlugin[];

export interface BundlerConfig {
    tailwind: {
        template?: string;
        disable?: boolean;
        config?: TailwindConfig;
    },

    postCss: {
        initializer?: PostCssInitializer;
    }
}

const gBundlerConfig: BundlerConfig = {
    tailwind: {
    },

    postCss: {
    }
}

export function getBundlerConfig(): BundlerConfig {
    return gBundlerConfig;
}