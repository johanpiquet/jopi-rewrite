export interface SearchParamFilter {
    /**
     * If true, transform the search param value to uppercase.
     * The default value is false.
     */
    toUpperCase?: boolean;
    /**
     * If true, transforme the search value to lowercase.
     * Has priority over toUpperCase.
     * Default value is true.
     */
    toLowerCase?: boolean;
    /**
     * If true, then ignore toLowerCase and toUpperCase.
     * The default value is false.
     */
    ignoreCase?: boolean;
    /**
     * If true, all values are allowed.
     * Default is false.
     */
    allowAllValues?: boolean;
    /**
     * If defined, then limit possible value to this list.
     * Has priority over allowAllValue.
     */
    values?: string[];
    /**
     * If true, then we can have the param name without a value.
     * Default is false.
     */
    allowsNameOnly?: boolean;
    /**
     * The max number of time this search params can be present.
     * The default value is 1.
     */
    max?: number;
    /**
     * If this search param is not present, then add it with this value.
     */
    defaultValue?: string;
    /**
     * For dev tests.
     * Allow calling "debugger" when processing this rule.
     */
    debug?: boolean;
}
export declare enum SortValues {
    ASC = "asc",
    DESC = "desc",
    IGNORE = "ignore"
}
export interface FilterOptions {
    /**
     * Allow saying how to sort params.
     * The default value is ASC.
     */
    sort?: SortValues;
    /**
     * If true, then remove all search params.
     */
    removeAll?: boolean;
}
export type SearchParamFilterFunction = (url: URL) => void;
/**
 * Create an optimized function which will filter a URL search params.
 */
export declare function buildSearchParamFilter(options: FilterOptions, params: {
    [paramName: string]: SearchParamFilter;
}): SearchParamFilterFunction;
