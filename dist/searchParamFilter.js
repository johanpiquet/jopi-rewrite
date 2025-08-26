export var SortValues;
(function (SortValues) {
    SortValues["ASC"] = "asc";
    SortValues["DESC"] = "desc";
    SortValues["IGNORE"] = "ignore";
})(SortValues || (SortValues = {}));
/**
 * Create an optimized function which will filter a URL search params.
 */
export function buildSearchParamFilter(options, params) {
    if (options.removeAll) {
        return url => url.search = "";
    }
    if (options.sort === undefined)
        options.sort = SortValues.ASC;
    const filters = {};
    for (const paramName in params) {
        const filter = params[paramName];
        if (filter.max === 0)
            continue;
        filters[paramName] = optionsToFunction(params[paramName]);
    }
    let paramNames = Object.keys(filters);
    if (options.sort === SortValues.ASC) {
        paramNames = paramNames.sort();
    }
    else if (options.sort === SortValues.DESC) {
        paramNames = paramNames.sort().reverse();
    }
    return function (url) {
        if (!url.search)
            return;
        const sp = url.searchParams;
        let newSearchValue = "";
        paramNames.forEach(paramName => {
            const filterPart = filters[paramName];
            if (filterPart.debug)
                debugger;
            let values;
            if (filterPart.onlyOneParam) {
                const value = sp.get(paramName);
                if (!value) {
                    if (filterPart.allowsNameOnly && sp.has(paramName)) {
                        newSearchValue += `&${paramName}`;
                    }
                    if (filterPart.defaultValue) {
                        newSearchValue += `&${paramName}=${filterPart.defaultValue}`;
                    }
                    return;
                }
                values = [value];
            }
            else {
                values = sp.getAll(paramName);
                if (values.length === 0) {
                    if (filterPart.defaultValue) {
                        newSearchValue += `&${paramName}=${filterPart.defaultValue}`;
                    }
                    else if (filterPart.allowsNameOnly && sp.has(paramName)) {
                        newSearchValue += `&${paramName}`;
                    }
                    return;
                }
                else if ((values.length === 1) && (values[0].length === 0)) {
                    if (filterPart.allowsNameOnly) {
                        newSearchValue += `&${paramName}`;
                    }
                }
            }
            const pipeline = filterPart.pipeline;
            if (pipeline.length === 1) {
                pipeline[0](values);
            }
            else {
                for (let i = 0; i < pipeline.length; i++) {
                    if (!pipeline[i](values))
                        break;
                }
            }
            if (values.length) {
                if (values.length === 1) {
                    if (values[0].length !== 0) {
                        newSearchValue += `&${paramName}=${values[0]}`;
                    }
                }
                else {
                    values.forEach(v => {
                        if (v.length !== 0)
                            newSearchValue += `&${paramName}=${v}`;
                    });
                }
            }
        });
        if (newSearchValue.length)
            url.search = "?" + newSearchValue.substring(1);
        else
            url.search = "";
    };
}
function optionsToFunction(filter) {
    const res = {
        pipeline: [],
        isRemoveAll: false,
        onlyOneParam: false,
        allowsNameOnly: false,
        debug: filter.debug
    };
    const pipeline = res.pipeline;
    //region Set default filter values
    if (filter.max === undefined)
        filter.max = 1;
    if (filter.allowAllValues === undefined)
        filter.allowAllValues = false;
    if (filter.allowsNameOnly === undefined)
        filter.allowsNameOnly = false;
    if (!filter.allowAllValues) {
        if (!filter.values) {
            res.isRemoveAll = true;
            return res;
        }
    }
    if (filter.ignoreCase) {
        filter.toLowerCase = false;
        filter.toUpperCase = false;
    }
    else {
        if (!filter.toLowerCase) {
            filter.toLowerCase = !filter.toUpperCase;
        }
        if (filter.toUpperCase) {
            if (filter.toLowerCase) {
                filter.toUpperCase = false;
            }
        }
        else {
            filter.toUpperCase = false;
        }
    }
    //endregion
    const limitToOne = filter.max === 1;
    res.onlyOneParam = limitToOne;
    res.defaultValue = filter.defaultValue;
    res.allowsNameOnly = filter.allowsNameOnly;
    // Transform allowed value.
    //
    if (filter.values) {
        if (filter.toLowerCase)
            filter.values = filter.values.map(v => v.toLowerCase());
        else if (filter.toUpperCase)
            filter.values = filter.values.map(v => v.toUpperCase());
    }
    if (filter.toUpperCase) {
        if (limitToOne) {
            pipeline.push(all => {
                all[0] = all[0].toUpperCase();
                return true;
            });
        }
        else {
            pipeline.push(all => {
                all.forEach((v, i) => {
                    all[i] = v.toUpperCase();
                });
                return true;
            });
        }
    }
    else if (filter.toLowerCase) {
        if (limitToOne) {
            pipeline.push(all => {
                all[0] = all[0].toLowerCase();
                return true;
            });
        }
        else {
            pipeline.push(all => {
                all.forEach((v, i) => {
                    all[i] = v.toLowerCase();
                });
                return true;
            });
        }
    }
    if (!filter.allowAllValues) {
        const allowedValues = filter.values;
        if (limitToOne) {
            pipeline.push(v => {
                const res = allowedValues.includes(v[0]);
                if (!res) {
                    v[0] = "";
                    return false;
                }
                return true;
            });
        }
        else {
            pipeline.push(v => {
                let res = false;
                for (let i = 0; i < v.length; i++) {
                    if (!allowedValues.includes(v[i]))
                        v[i] = "";
                    else
                        res = true;
                }
                return res;
            });
        }
    }
    return res;
}
//# sourceMappingURL=searchParamFilter.js.map