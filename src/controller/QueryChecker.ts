import {ValueMatcher} from "./ValueMatcher";
import Log from "../Util";

export class QueryChecker extends ValueMatcher {
    public checkKeys(obj: any, pKey: any) {
        if (this.keyValid === true) {
            this.foundKeys.push(pKey);
            let isObjNullUndefined: boolean = obj === null || obj === undefined;
            let emptyObj: boolean = !isObjNullUndefined &&
                typeof obj === "object" && !(obj instanceof Array) && Object.keys(obj).length === 0;
            if (emptyObj) {
                if (pKey !== "WHERE") {
                    this.keyValid = false;
                }
            }
            try {
                this.objSizeChecker(pKey, obj);
                Object.keys(obj).forEach((key) => {
                    this.process(obj, key, pKey);
                });
            } catch (e) {
                this.keyValid = false;
            }
        }
    }

    private process(obj: any, key: string, pKey: any) {
        if (obj[key] === null || obj[key] === undefined) {
            this.keyValid = false;
        } else if (typeof obj[key] !== "object" && !(obj[key] instanceof Array)) {
            this.processStrings(key, obj, pKey);
        } else if (obj[key] instanceof Array) {
            this.processArrays(key, obj, pKey);
        } else if (typeof obj[key] === "object") {
            let isOperator = this.mKeyOperators.includes(key) || this.sKeyOperators.includes(key);
            let filterParentValid = isOperator && !["AND", "OR", "NOT", "WHERE"].includes(pKey);
            if (filterParentValid) {
                this.keyValid = false;
            }
            if (!(typeof obj[key] === "string" || obj[key] instanceof String)) {
                if (this.keyValid === true) {
                    let isApplyKey: boolean = (pKey === "APPLY");
                    this.keyValid = this.validKeyObj.includes(key) || isApplyKey;
                    if (isApplyKey) {
                        if (key === "" || key.includes("_")) {
                            this.keyValid = false;
                        }
                        this.foundApplyKeys.push(key);
                    }
                }
                this.checkKeys(obj[key], key);
            }
        }
    }

    private processArrays(key: string, obj: any, pKey: any) {
        this.arrSizeCheck(key, obj[key]);
        if (this.keyValid === true) {
            this.keyValid =
                this.validKeysArr.includes(key) || (pKey === "APPLY" && !key.includes("_"));
        }
        let array = obj[key];
        array.forEach((element: any) => {
            this.arrCheck(element, key);
            if (!(typeof element === "string" || element instanceof String)) {
                let keyOneOfArr = ["GROUP", "keys", "COLUMNS"].includes(key);
                if (keyOneOfArr) {
                    this.keyValid = false;
                }
                this.checkKeys(element, key);
            } else {
                if (key === "GROUP") {
                    this.foundGroupKeys.push(element);
                } else if (key === "keys") {
                    this.foundOrderKeys.push(element);
                } else if (key === "COLUMNS") {
                    this.foundColumnKeys.push(element);
                }
                this.foundKeys.push(element);
            }
        });
    }

    private arrCheck(element: any, key: any) {
        if (key === "GROUP" || key === "keys" || key === "COLUMNS") {
            if (element.includes("_")) {
                this.matchOrder(element);
            }
        } else {
            if (element instanceof Array) {
                this.keyValid = false;
            }
        }
    }

    private processStrings(key: any, obj: any, pKey: any) {
        if (this.validApplyTokens.includes(key)) {
            this.objSizeChecker(key, obj);
            this.foundKeys.push(obj[key]);
            this.foundKeys.push(key);
            this.foundTokens.push(key);
            this.foundTokenKeys.push(obj[key]);
            this.checkTokenType(key, obj[key]);
        } else if (key === "ORDER") {
            this.valueMatcher(pKey, key, obj[key]);
            this.foundOrderKeys.push(obj[key]);
        } else {
            this.valueMatcher(pKey, key, obj[key]);
            this.foundKeys.push(key);
        }
    }

    private checkTokenType(token: any, key: any) {
        let keyReduced;
        try {
            keyReduced = key.substring(key.indexOf("_") + 1, key.length);
        } catch (e) {
            this.keyValid = false;
        }

        if (!(this.sKeysCourses.includes(keyReduced) || this.sKeysRooms.includes(keyReduced)
            || this.mKeysCourses.includes(keyReduced) || this.mKeysRooms.includes(keyReduced))) {
            this.keyValid = false;
        }

        if ((this.sKeysCourses.includes(keyReduced) || this.sKeysRooms.includes(keyReduced)) && token !== "COUNT") {
            this.keyValid = false;
        }
    }

    private arrSizeCheck(key: any, array: any) {
        let emptyArr = key !== "APPLY" && array.length === 0;
        if (emptyArr) {
            this.keyValid = false;
        }
    }

    private objSizeChecker(pKey: any, obj: any) {
        let comparators: any[] = ["IS", "EQ", "GT", "LT"];
        let logic: any[] = ["AND", "OR", "NOT"];
        let tokens: any[] = ["MAX", "MIN", "COUNT", "AVG", "SUM"];
        let comparatorsCheck: boolean = comparators.includes(pKey) && Object.keys(obj).length !== 1;
        let transformationsCheck: boolean = pKey === "TRANSFORMATIONS" && (Object.keys(obj).length !== 2
            || !Object.keys(obj).includes("GROUP") || !Object.keys(obj).includes("APPLY"));
        let applyCheck: boolean = pKey === "APPLY" && Object.keys(obj).length !== 1;
        let tokenCheck: boolean = tokens.includes(pKey) && Object.keys(obj).length !== 1;
        let optionsCheck: boolean =
            pKey === "OPTIONS" && ((Object.keys(obj).length === 1 && !Object.keys(obj).includes("COLUMNS")) ||
            (Object.keys(obj).length !== 1 && Object.keys(obj).length === 2 && !Object.keys(obj).includes("ORDER")));
        let whereCheck: boolean = pKey ===
            "WHERE" && (!(Object.keys(obj).length === 0 || Object.keys(obj).length === 1) ||
                (Object.keys(obj).length === 1 && (!tokens.includes(Object.keys(obj)[0]) &&
                    !comparators.includes(Object.keys(obj)[0]) && !logic.includes(Object.keys(obj)[0]))));
        let notCheck: boolean = pKey === "NOT" && (Object.keys(obj).length !== 1 ||
            (!comparators.includes(Object.keys(obj)[0]) && !logic.includes(Object.keys(obj)[0])));
        let orderCheck: boolean = pKey === "ORDER" && (Object.keys(obj).length !== 2 ||
            (!(typeof obj === "string" || obj instanceof String) &&
                (!Object.keys(obj).includes("dir") || !Object.keys(obj).includes("keys"))));
        let isObjNullUndefined: boolean = obj === null || obj === undefined;
        let isObj: boolean = typeof obj === "object" && !(obj instanceof Array);
        let emptyObj: boolean = !isObjNullUndefined && isObj && Object.keys(obj).length === 0;
        let andORCheck = (pKey === "AND" || pKey === "OR") && (!isObj || emptyObj);
        if (comparatorsCheck || transformationsCheck || applyCheck || tokenCheck || optionsCheck || whereCheck
            || notCheck || orderCheck || andORCheck) {
            this.keyValid = false;
        }
    }
}
