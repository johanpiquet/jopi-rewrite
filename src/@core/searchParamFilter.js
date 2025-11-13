export var SortValues;
(function (SortValues) {
    // noinspection JSUnusedGlobalSymbols
    SortValues["ASC"] = "asc";
    SortValues["DESC"] = "desc";
    SortValues["IGNORE"] = "ignore";
})(SortValues || (SortValues = {}));
/**
 * Create an optimized function which will filter a URL search params.
 */
export function buildSearchParamFilter(options, params) {
    if (options.removeAll) {
        return function (url) { return url.search = ""; };
    }
    if (options.sort === undefined)
        options.sort = SortValues.ASC;
    var filters = {};
    for (var paramName in params) {
        var filter = params[paramName];
        if (filter.max === 0)
            continue;
        filters[paramName] = optionsToFunction(params[paramName]);
    }
    var paramNames = Object.keys(filters);
    if (options.sort === SortValues.ASC) {
        paramNames = paramNames.sort();
    }
    else if (options.sort === SortValues.DESC) {
        paramNames = paramNames.sort().reverse();
    }
    return function (url) {
        if (!url.search)
            return;
        var sp = url.searchParams;
        var newSearchValue = "";
        paramNames.forEach(function (paramName) {
            var filterPart = filters[paramName];
            if (filterPart.debug)
                debugger;
            var values;
            if (filterPart.onlyOneParam) {
                var value = sp.get(paramName);
                if (!value) {
                    if (filterPart.allowsNameOnly && sp.has(paramName)) {
                        newSearchValue += "&".concat(paramName);
                    }
                    if (filterPart.defaultValue) {
                        newSearchValue += "&".concat(paramName, "=").concat(filterPart.defaultValue);
                    }
                    return;
                }
                values = [value];
            }
            else {
                values = sp.getAll(paramName);
                if (values.length === 0) {
                    if (filterPart.defaultValue) {
                        newSearchValue += "&".concat(paramName, "=").concat(filterPart.defaultValue);
                    }
                    else if (filterPart.allowsNameOnly && sp.has(paramName)) {
                        newSearchValue += "&".concat(paramName);
                    }
                    return;
                }
                else if ((values.length === 1) && (values[0].length === 0)) {
                    if (filterPart.allowsNameOnly) {
                        newSearchValue += "&".concat(paramName);
                    }
                }
            }
            var pipeline = filterPart.pipeline;
            if (pipeline.length === 1) {
                pipeline[0](values);
            }
            else {
                for (var i = 0; i < pipeline.length; i++) {
                    if (!pipeline[i](values))
                        break;
                }
            }
            if (values.length) {
                if (values.length === 1) {
                    if (values[0].length !== 0) {
                        newSearchValue += "&".concat(paramName, "=").concat(values[0]);
                    }
                }
                else {
                    values.forEach(function (v) {
                        if (v.length !== 0)
                            newSearchValue += "&".concat(paramName, "=").concat(v);
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
    var res = {
        pipeline: [],
        isRemoveAll: false,
        onlyOneParam: false,
        allowsNameOnly: false,
        debug: filter.debug
    };
    var pipeline = res.pipeline;
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
    var limitToOne = filter.max === 1;
    res.onlyOneParam = limitToOne;
    res.defaultValue = filter.defaultValue;
    res.allowsNameOnly = filter.allowsNameOnly;
    // Transform allowed value.
    //
    if (filter.values) {
        if (filter.toLowerCase)
            filter.values = filter.values.map(function (v) { return v.toLowerCase(); });
        else if (filter.toUpperCase)
            filter.values = filter.values.map(function (v) { return v.toUpperCase(); });
    }
    if (filter.toUpperCase) {
        if (limitToOne) {
            pipeline.push(function (all) {
                all[0] = all[0].toUpperCase();
                return true;
            });
        }
        else {
            pipeline.push(function (all) {
                all.forEach(function (v, i) {
                    all[i] = v.toUpperCase();
                });
                return true;
            });
        }
    }
    else if (filter.toLowerCase) {
        if (limitToOne) {
            pipeline.push(function (all) {
                all[0] = all[0].toLowerCase();
                return true;
            });
        }
        else {
            pipeline.push(function (all) {
                all.forEach(function (v, i) {
                    all[i] = v.toLowerCase();
                });
                return true;
            });
        }
    }
    if (!filter.allowAllValues) {
        var allowedValues_1 = filter.values;
        if (limitToOne) {
            pipeline.push(function (v) {
                var res = allowedValues_1.includes(v[0]);
                if (!res) {
                    v[0] = "";
                    return false;
                }
                return true;
            });
        }
        else {
            pipeline.push(function (v) {
                var res = false;
                for (var i = 0; i < v.length; i++) {
                    if (!allowedValues_1.includes(v[i]))
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
