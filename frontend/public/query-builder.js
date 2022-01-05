/**
 * Builds a query object using the current document object model (DOM).
 * Must use the browser's global document object {@link https://developer.mozilla.org/en-US/docs/Web/API/Document}
 * to read DOM information.
 *
 * @returns query object adhering to the query EBNF
 */

let sKeys = ["dept", "id", "instructor", "title", "uuid", "fullname", "shortname", "number",
    "name", "address", "type", "furniture", "href"];
let mKeys = ["avg", "pass", "fail", "audit", "year", "lat", "lon", "seats"];

CampusExplorer.buildQuery = () => {
    let query = {};

    let tabCourses = document.getElementById("tab-courses"); // object with id "tab-courses"
    let tabPanelCourses = tabCourses.getAttribute("class"); // "tab-panel active" or "tab-panel"
    let type = tabPanelCourses === "tab-panel active" ? 0 : 1;

    let where = buildWhere(type);
    let columns = buildColumnsGroups(type, 0);
    let groups = buildColumnsGroups(type, 1);
    let order = buildOrder(type);
    let transform = buildTransform(type);

    if (order === undefined) {
        if (transform.length === 0 && groups.length === 0) {
            query = {
                "WHERE": where,
                "OPTIONS": {
                    "COLUMNS": columns,
                }
            }
        } else {
            query = {
                "WHERE": where,
                "OPTIONS": {
                    "COLUMNS": columns,
                },
                "TRANSFORMATIONS": {
                    "GROUP": groups,
                    "APPLY": transform
                }
            }
        }
    } else {
        if (transform.length === 0 && groups.length === 0) {
            query = {
                "WHERE": where,
                "OPTIONS": {
                    "COLUMNS": columns,
                    "ORDER": order
                }
            }
        } else {
            query = {
                "WHERE": where,
                "OPTIONS": {
                    "COLUMNS": columns,
                    "ORDER": order
                },
                "TRANSFORMATIONS": {
                    "GROUP": groups,
                    "APPLY": transform
                }
            }
        }
    }

    return query;
};

// type == 0 for courses, type == 1 for rooms
// fn == 0 for columns, fn == 1 for groups
function buildColumnsGroups(type, fn) {
    let id = type ? "rooms_" : "courses_";
    let f = fn ? "form-group groups" : "form-group columns";
    let cgClass = document.getElementsByClassName(f)[type];
    let cgCG = cgClass.getElementsByClassName("control-group")[0];
    let cgCFs = cgCG.getElementsByClassName("control field");
    let cgs = [];
    for (let cf of cgCFs) {
        let input = cf.getElementsByTagName("input")[0];
        if (input.hasAttribute("checked")) {
            cgs.push(id.concat(input.getAttribute("value")));
        }
    }

    try {
        let cgCTs = cgCG.getElementsByClassName("control transformation");
        for (let ct of cgCTs) {
            let input = ct.getElementsByTagName("input")[0];
            if (input.hasAttribute("checked")) {
                cgs.push(input.getAttribute("value"));
            }
        }
    } catch (e) {
        // do nothing
    }

    return cgs;
}

// type == 0 for courses, type == 1 for rooms
function buildOrder(type) {
    let id = type ? "rooms_" : "courses_";
    let orderClass = document.getElementsByClassName("form-group order")[type];
    let orderCG = orderClass.getElementsByClassName("control-group")[0];
    let orderCOF = orderCG.getElementsByClassName("control order fields")[0];
    let orderCD = orderCG.getElementsByClassName("control descending")[0];
    let select = orderCOF.getElementsByTagName("select")[0];
    let options = select.getElementsByTagName("option");
    let orders = [];
    for (let option of options) {
        if (option.hasAttribute("selected")) {
            let val = option.getAttribute("value");
            if (option.hasAttribute("class")) {
                orders.push(val);
            } else {
                orders.push(id.concat(val));
            }
        }
    }
    let dir = orderCD.getElementsByTagName("input")[0].hasAttribute("checked") ? "DOWN" : "UP";

    if (orders.length === 0) {
        return undefined;
    } else {
        return  {
            "dir": dir,
            "keys": orders
        }
    }
}

function buildTransform(type) {
    let id = type ? "rooms_" : "courses_";
    let transformClass = document.getElementsByClassName("form-group transformations")[type];
    let transformContainer = transformClass.getElementsByClassName("transformations-container")[0];
    let transformationCGs = transformContainer.getElementsByClassName("control-group transformation");
    let transformations = [];
    if (transformationCGs.length === 0) {
        return [];
    } else {
        for (let transformationCG of transformationCGs) {
            let cTerm = transformationCG.getElementsByClassName("control term")[0];
            let cOperators = transformationCG.getElementsByClassName("control operators")[0];
            let cFields = transformationCG.getElementsByClassName("control fields")[0];
            let input = cTerm.getElementsByTagName("input")[0];
            let term = input.hasAttribute("value") ? input.getAttribute("value") : "";
            let operators = cOperators.getElementsByTagName("select")[0].getElementsByTagName("option");
            let fields = cFields.getElementsByTagName("select")[0].getElementsByTagName("option");
            let operator = findSelected(operators);
            let field = id.concat(findSelected(fields));

            transformations.push({
                [term]: {
                    [operator]: field
                }
            })
        }
    }

    return transformations;
}

function findSelected(arr) {
    let result = "";
    for (let val of arr) {
        if (val.hasAttribute("selected")) {
            result = val.getAttribute("value");
        }
    }
    return result;
}

function getDropdownValue(dropdown) {
    for (let key of dropdown) { // iterate through m and s keys
        let isKeySelected = key.hasAttribute("selected");
        if (isKeySelected) {
            return key.getAttribute("value");
        }
    }
}

function processConditionsContainer(conditionsContainer) {
    let conditions = conditionsContainer.getElementsByClassName("control-group condition");

    let processedConditionsArr = [];
    for (let condition of conditions) {
        let processedCondition = {};
        let notBox = condition.getElementsByClassName("control not")[0].getElementsByTagName("input")[0];
        let isNotBoxChecked = notBox.hasAttribute("checked");
        let keysDropdown = condition.getElementsByClassName("control fields")[0].getElementsByTagName("select")[0];
        let keySelected = getDropdownValue(keysDropdown); // get m or s key
        let comparatorsDropdown = condition.getElementsByClassName("control operators")[0].getElementsByTagName("select")[0];
        let comparatorSelected = getDropdownValue(comparatorsDropdown);
        let textBox = condition.getElementsByClassName("control term")[0].getElementsByTagName("input")[0];
        let textBoxInput = ""; // test when input box is empty
        if (textBox.hasAttribute("value")) {
            textBoxInput = textBox.getAttribute("value");
        }
        processedCondition = {
            notBox: isNotBoxChecked,
            key: keySelected,
            comparator: comparatorSelected,
            input: textBoxInput
        }
        processedConditionsArr.push(processedCondition);
    }
    return processedConditionsArr;
}

function convertConditionArrIntoObjects (processedConditionsArr, type) {
    let id = type ? "rooms_" : "courses_";
    let arr = [];
    for (let processedCondition of processedConditionsArr) {
        let coursesOrRoomKeyObject = {};
        let coursesOrRoomKey = id.concat(processedCondition.key); // courses_audit
        let out = processedCondition.input;
        if (mKeys.includes(processedCondition.key)) {
            let parse = Number(processedCondition.input);
            if (!isNaN(parse) && processedCondition.input !== "") {
                out = parse;
            }
        }
        coursesOrRoomKeyObject[coursesOrRoomKey] = out;
        let comparatorObject = {};
        comparatorObject[processedCondition.comparator] =  coursesOrRoomKeyObject;
        let comparatorObjectAfterProcessingNot = {}; // can be { "NOT": {comparatorObject}} or comparatorObject
        if (processedCondition.notBox) {
            comparatorObjectAfterProcessingNot["NOT"] = comparatorObject;
        } else {
            comparatorObjectAfterProcessingNot = comparatorObject;
        }
        arr.push(comparatorObjectAfterProcessingNot);
    }
    return arr;
}

function applyConditions(allType, anyType, noneType, numConditions, arrOfConditionObjects) {
    let resultingObject = {};
    if (numConditions === 0) {
        return resultingObject;
    } else if (numConditions === 1) {
        if (noneType) {
            resultingObject["NOT"] = arrOfConditionObjects[0];
        } else {
            resultingObject = arrOfConditionObjects[0];
        }
    } else if (allType) {
        resultingObject["AND"] = arrOfConditionObjects;
    } else if (anyType) {
        resultingObject["OR"] = arrOfConditionObjects;
    } else if (noneType) {
        let arrOfConditionNotObjects = [];
        for (let conditionObject of arrOfConditionObjects) {
            arrOfConditionNotObjects.push({
                "NOT": conditionObject
            });
        }
        resultingObject["AND"] = arrOfConditionNotObjects;
    }
    return resultingObject;
}

function buildWhere(type) {
    let conditionsContainer = document.getElementsByClassName("conditions-container")[type];
    let processedConditionsArr = processConditionsContainer(conditionsContainer);
    let conditionTypes = document.getElementsByClassName("control-group condition-type")[type];
    let allType = conditionTypes.getElementsByClassName("control conditions-all-radio")[0].getElementsByTagName("input")[0].hasAttribute("checked")
    let anyType = conditionTypes.getElementsByClassName("control conditions-any-radio")[0].getElementsByTagName("input")[0].hasAttribute("checked")
    let noneType = conditionTypes.getElementsByClassName("control conditions-none-radio")[0].getElementsByTagName("input")[0].hasAttribute("checked")
    let arrOfConditionObjects = convertConditionArrIntoObjects(processedConditionsArr, type);
    return applyConditions(allType, anyType, noneType, processedConditionsArr.length, arrOfConditionObjects);
}
