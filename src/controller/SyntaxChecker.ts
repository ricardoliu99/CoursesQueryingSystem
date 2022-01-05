import {QueryChecker} from "./QueryChecker";
import {InsightDatasetKind} from "./IInsightFacade";
import Log from "../Util";

export class SyntaxChecker extends QueryChecker {
    protected dataSetName: string;
    protected dataSetKind: InsightDatasetKind;

    public getSKeys() {
        return this.sKeysCourses.concat(this.sKeysRooms);
    }

    public getMKeys() {
        return this.mKeysCourses.concat(this.mKeysRooms);
    }

    public getGroupKeys() {
        return this.foundGroupKeys;
    }

    public getTokenKeys() {
        return this.foundTokenKeys;
    }

    public getDataSetKind() {
        return this.dataSetKind;
    }

    public syntaxChecker(query: any): boolean {
        if (query !== null && query !== undefined) {
            if (query.hasOwnProperty("WHERE") && query.hasOwnProperty("OPTIONS")) {
                if (Object.keys(query).length === 2 ||
                    (Object.keys(query).length === 3 && query.hasOwnProperty("TRANSFORMATIONS"))) {
                    let where = query["WHERE"];
                    let options = query["OPTIONS"];

                    if (this.notNullArray(where) && this.notNullArray(options)) {
                        this.checkKeys(where, "WHERE");
                        this.checkKeys(options, "OPTIONS");
                    } else {
                        this.keyValid = false;
                    }
                    if (Object.keys(query).length === 3 && query.hasOwnProperty("TRANSFORMATIONS")) {
                        let transformations = query["TRANSFORMATIONS"];
                        this.checkKeys(transformations, "TRANSFORMATIONS");
                    }
                } else {
                    this.keyValid = false;
                }
            } else {
                this.keyValid = false;
            }

            if (!(Object.keys(query).length === 3 && query.hasOwnProperty("TRANSFORMATIONS"))) {
                this.checkSetsWithoutTransformations();
            } else {
                this.checkSetsWithTransformations();
            }
        } else {
            this.keyValid = false;
        }

        // Log.trace("all", this.foundKeys);
        // Log.trace("apply", this.foundApplyKeys);
        // Log.trace("group", this.foundGroupKeys);
        // Log.trace("columns", this.foundColumnKeys);
        // Log.trace("order", this.foundOrderKeys);
        // Log.trace("token key", this.foundTokenKeys);
        // Log.trace("token", this.foundTokens);
        // Log.trace("filter", this.foundFilterKeys);
        // Log.trace("valid?", this.keyValid);

        if (this.keyValid) {
            this.kindExtractor();
        }

        return this.keyValid;
    }

    public getDatasetName() {
        return this.dataSetName;
    }

    private kindExtractor() {
        let arr = this.foundGroupKeys.concat(this.foundColumnKeys).concat(this.foundColumnKeys).
        concat(this.foundTokenKeys).concat(this.foundFilterKeys);
        let kind: any = null;
        arr.forEach((key) => {
            if (key.includes("_")) {
                key = key.substring(key.indexOf("_") + 1, key.length);
                let isRooms: boolean = this.sKeysRooms.includes(key) || this.mKeysRooms.includes(key);
                let isCourses: boolean = this.sKeysCourses.includes(key) || this.mKeysCourses.includes(key);
                if (kind === null) {
                    if (isRooms) {
                        kind = InsightDatasetKind.Rooms;
                    } else if (isCourses) {
                        kind = InsightDatasetKind.Courses;
                    }
                } else {
                    if (kind === InsightDatasetKind.Rooms) {
                        if (!isRooms) {
                            this.keyValid = false;
                        }
                    } else {
                        if (!isCourses) {
                            this.keyValid = false;
                        }
                    }
                }
            }
        });

        this.dataSetKind = kind;
    }

    private checkSetsWithTransformations() {
        this.duplicateChecker(this.foundApplyKeys);

        let datasetNames: any[] = this.foundApplyKeys.slice(0);
        let ogSize: number = datasetNames.length;

        datasetNames = this.datasetNameChecker(this.foundColumnKeys, datasetNames, datasetNames.length === ogSize);
        datasetNames = this.datasetNameChecker(this.foundFilterKeys, datasetNames, datasetNames.length === ogSize);
        datasetNames = this.datasetNameChecker(this.foundGroupKeys, datasetNames, datasetNames.length === ogSize);
        datasetNames = this.datasetNameChecker(this.foundOrderKeys, datasetNames, datasetNames.length === ogSize);
        this.datasetNameChecker(this.foundTokenKeys, datasetNames, datasetNames.length === ogSize);

        this.subsetChecker(this.trimGroupKeys(), this.getSKeys().concat(this.getMKeys()));
        this.subsetChecker(this.foundColumnKeys, this.foundApplyKeys.concat(this.foundGroupKeys));
        this.subsetChecker(this.foundOrderKeys, this.foundColumnKeys);


        this.dataSetName = datasetNames[this.foundApplyKeys.length];
    }

    private trimGroupKeys(): any[] {
        let dup = this.getGroupKeys().slice(0);
        dup.forEach(((val, index) => {
            if ((typeof val === "string" || val instanceof String) && val.includes("_")) {
                dup[index] = val.substring(val.indexOf("_") + 1, val.length);
            } else {
                this.keyValid = false;
            }
        }));
        return dup;
    }

    private checkSetsWithoutTransformations() {
        let datasetNames: any[] = [];
        datasetNames = this.datasetNameChecker(this.foundColumnKeys, datasetNames, true);
        datasetNames = this.datasetNameChecker(this.foundFilterKeys, datasetNames, false);
        this.datasetNameChecker(this.foundOrderKeys, datasetNames, false);
        this.subsetChecker(this.foundOrderKeys, this.foundColumnKeys);

        this.dataSetName = datasetNames[0];
    }

    private subsetChecker(children: any[], parent: any[]) {
        children.forEach((child) => {
            if (!parent.includes(child))  {
                this.keyValid = false;
                return;
            }
        });
    }

    private datasetNameChecker(arr: any[], datasetNames: any[], first: boolean): any[] {
        arr.forEach((val) => {
            if ((typeof val === "string" || val instanceof String)) {
                if (val.includes("_")) {
                    let reducedVal: any = val.substring(0, val.indexOf("_"));
                    if (!first && !datasetNames.includes(reducedVal)) {
                        this.keyValid = false;
                    }
                    if (first) {
                        first = false;
                    }
                    datasetNames.push(reducedVal);
                }
            } else {
                this.keyValid = false;
            }
        });

        return datasetNames;
    }

    private duplicateChecker(arr: any[]) {
        let seenSoFar: any[] = [];
        arr.forEach((val) => {
            if (seenSoFar.includes(val)) {
                this.keyValid = false;
                return;
            }
            seenSoFar.push(val);
        });
    }

    private notNullArray(obj: any) {
        return !(obj === null || obj === undefined || obj instanceof Array);
    }
}
