import Log from "../Util";

export class ValueMatcher {
    protected validKeyObj: any[] =
        ["WHERE", "OPTIONS", "TRANSFORMATIONS", "ORDER", "IS", "NOT", "EQ", "GT", "LT", "dir"];

    protected validApplyTokens: any[] = [ "MAX", "MIN", "COUNT", "SUM", "AVG"];
    protected validKeysArr: any[] = ["AND", "OR", "COLUMNS", "keys", "GROUP", "APPLY"];
    protected sKeyOperators: any[] = ["IS"];
    protected mKeyOperators: any[] = ["GT", "LT", "EQ"];
    protected sKeysCourses: any[] = ["dept", "id", "instructor", "title", "uuid"];
    protected sKeysRooms: any[] = ["fullname", "shortname", "number", "name", "address", "type", "furniture", "href"];
    protected mKeysCourses: any[] = ["avg", "pass", "fail", "audit", "year"];
    protected mKeysRooms: any[] = ["lat", "lon", "seats"];
    protected keyValid = true;
    protected foundKeys: any[] = [];
    protected foundColumnKeys: any[] = [];
    protected foundOrderKeys: any[] = [];
    protected foundGroupKeys: any[] = [];
    protected foundApplyKeys: any[] = [];
    protected foundTokenKeys: any[] = [];
    protected foundFilterKeys: any[] = [];
    protected foundTokens: any[] = [];

    public valueMatcher(pKey: any, key: any, value: any) {
        let keyIsString = typeof key === "string" || key instanceof String;
        if (this.sKeyOperators.includes(pKey)) {
            this.matchSKey(pKey, key, value, keyIsString);
        } else if (this.mKeyOperators.includes(pKey)) {
            this.matchMKey(key, value, keyIsString);
        } else if (pKey === "ORDER" && key === "dir") {
            this.matchDirection(value, keyIsString);
        } else if (pKey === "OPTIONS" && key === "ORDER" && (typeof value === "string" || value instanceof String)) {
            if (value.includes("_")) {
                this.matchOrder(value);
            }
            this.foundFilterKeys.push(value);
        }  else {
            this.keyValid = false;
        }
    }

    protected matchOrder(value: any) {
        let keyReduced;
        try {
            keyReduced = value.substring(value.indexOf("_") + 1, value.length);
        } catch (e) {
            this.keyValid = false;
        }
        let keyIsKey = this.sKeysCourses.includes(keyReduced) || this.sKeysRooms.includes(keyReduced) ||
            this.mKeysCourses.includes(keyReduced) || this.mKeysRooms.includes(keyReduced);
        if (!keyIsKey) {
            this.keyValid = false;
        }
    }

    private matchDirection(value: any, keyIsString: boolean) {
        let notUPorDown = !(value === "UP" || value === "DOWN");
        if (!keyIsString || notUPorDown) {
            this.keyValid = false;
        }
    }

    private matchMKey(key: any, value: any, keyIsString: boolean) {
        let keyReduced;
        try {
            keyReduced = key.substring(key.indexOf("_") + 1, key.length);
        } catch (e) {
            this.keyValid = false;
        }
        let keyIsmKey = this.mKeysCourses.includes(keyReduced) || this.mKeysRooms.includes(keyReduced);
        let valueIsNum = typeof value === "number" || value instanceof Number;
        if (!(keyIsString && keyIsmKey && valueIsNum)) {
            this.keyValid = false;
        }
        this.foundFilterKeys.push(key);
    }

    private matchSKey(pKey: any, key: any, value: any, keyIsString: boolean) {
        let keyReduced;
        try {
            keyReduced = key.substring(key.indexOf("_") + 1, key.length);
        } catch (e) {
            this.keyValid = false;
        }
        let keyIssKey = this.sKeysCourses.includes(keyReduced) || this.sKeysRooms.includes(keyReduced);
        let valueIsString = typeof value === "string" || value instanceof String;

        if (pKey === "IS") {
            let str = value;
            if (value.startsWith("*")) {
                str = str.substring(1, str.length);
            }
            if (value.endsWith("*")) {
                str = str.substring(0, str.length - 1);
            }
            if (str.includes("*")) {
                this.keyValid = false;
            }
        }

        if (!(keyIsString && keyIssKey && valueIsString)) {
            this.keyValid = false;
        }
        this.foundFilterKeys.push(key);
    }
}
