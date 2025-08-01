import * as F from "jopi-rewrite";

const filterOneValue = F.buildSearchParamFilter({}, {
    allowOnlyValues: {values: ["yes", "no"]},

    toUpper: {toUpperCase: true, values: ["yes"]},
    toLower: {toLowerCase: true, values: ["yes"]},
    ignoreCase: {ignoreCase: true, values: ["YeS"]},

    allowAllValues: {allowAllValues: true},
    allowAllValuesUC: {allowAllValues: true, toUpperCase: true},
    allowAllValuesLC: {allowAllValues: true, toLowerCase: true},
    allowAllValuesKC: {allowAllValues: true, ignoreCase: true},

    allowsNameOnly: {allowsNameOnly: true, values: ["yes"]}
});

const filterMultiValue = F.buildSearchParamFilter({}, {
    allowOnlyValues: {values: ["yes", "no"], max: 100},

    toUpper: {toUpperCase: true, values: ["yes"], max: 100},
    toLower: {toLowerCase: true, values: ["yes"], max: 100},
    ignoreCase: {ignoreCase: true, values: ["YeS"], max: 100},

    allowAllValues: {allowAllValues: true, max: 100},
    allowAllValuesUC: {allowAllValues: true, toUpperCase: true, max: 100},
    allowAllValuesLC: {allowAllValues: true, toLowerCase: true, max: 100},
    allowAllValuesKC: {allowAllValues: true, ignoreCase: true, max: 100},

    allowsNameOnly: {allowsNameOnly: true, values: ["yes"], max: 100}
});

function test(f: F.SearchParamFilterFunction, search: string, expect: string, label: string) {
    if (search[0]!=="?") throw "invalid value";
    if (expect && expect[0]!=="?") throw "invalid value";

    const url = new URL("https://aaa" + search);

    f(url);

    search = search.padEnd(50);

    if (url.search!==expect) {
        console.info("❌  [" + label + "]", search, "--> expect[" + expect +"]", "found[" + url.search + "]");
    } else {
        //console.info("✅  [" + label + "]", search, "--> expect[" + expect +"]");
    }
}

// [x] max
// [x] allowAllValues
// [e] allowsNameOnly
// [x] toLowerCase / toUpperCase / ignoreCase
// [x] allowedValues

function testWith(multi: boolean) {
    let filter = multi ? filterMultiValue : filterOneValue;
    let label = multi ? "multi-values" : "single-value"

    // Validate more than one param.
    test(filter, "?toUpper=YeS&toLower=YeS&toRemove", "?toLower=yes&toUpper=YES", label);

    // Validate allowsNameOnly
    test(filter, "?allowsNameOnly=yes", "?allowsNameOnly=yes", label);
    test(filter, "?allowsNameOnly", "?allowsNameOnly", label);

    // Validate allowed value range.
    test(filter, "?allowOnlyValues=yes", "?allowOnlyValues=yes", label);
    test(filter, "?allowOnlyValues=no", "?allowOnlyValues=no", label);
    test(filter, "?allowOnlyValues=unknown", "", label);

    // Validate upper/lower case transform.
    test(filter, "?toUpper=YeS", "?toUpper=YES", label);
    test(filter, "?toLower=YeS", "?toLower=yes", label);
    test(filter, "?ignoreCase=YeS", "?ignoreCase=YeS", label);

    // Validate removable of unknown.
    test(filter, "?toUpper=yes&toRemove=toto", "?toUpper=YES", label);

    // Validate value keep as-is, with lower/upper case transform and no transform.
    //
    test(filter, "?allowAllValues=myVALUE", "?allowAllValues=myvalue", label);
    test(filter, "?allowAllValuesUC=myVALUE", "?allowAllValuesUC=MYVALUE", label);
    test(filter, "?allowAllValuesLC=myVALUE", "?allowAllValuesLC=myvalue", label);
    test(filter, "?allowAllValuesKC=myVALUE", "?allowAllValuesKC=myVALUE", label);
}

testWith(false);
testWith(true);