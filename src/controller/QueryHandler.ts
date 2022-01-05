import {InsightDatasetKind} from "./IInsightFacade";
import Log from "../Util";

export class QueryHandler {
    private dataset: any;
    private kind: any;

    constructor(dataset: any, kind: any) {
        this.dataset = dataset;
        this.kind = kind;
    }

    public processOperators(obj: any): any {
        if (obj.hasOwnProperty("AND")) {
            let andObj: any[] = obj["AND"];
            return this.andHelper(andObj);
        } else if (obj.hasOwnProperty("OR")) {
            let orObj: any[] = obj["OR"];
            return this.orHelper(orObj);
        } else if (obj.hasOwnProperty("NOT")) {
            return this.notHelper(obj);
        } else {
            return this.processLeafOperators(obj); // returns processedDatasets
        }
    }

    public processLeafOperators(obj: any): any {
        let processedDataset: { [id: string]: {} } = {};
        let firstKey = Object.keys(Object.values(obj)[0])[0];

        let numOrStrKey = firstKey.substring(firstKey.indexOf("_") + 1, firstKey.length);
        let arrayOfSections: any[] = Object.values(this.dataset);
        let leafValue: any = Object.values(Object.values(obj)[0])[0]; // value to be compared
        let comparator = Object.keys(obj)[0];
        let identifier: any;
        if (this.kind === InsightDatasetKind.Courses) {
            identifier = "uuid";
        } else {
            identifier = "name";
        }

        arrayOfSections =
            this.processSections(comparator, arrayOfSections, numOrStrKey, leafValue);
        arrayOfSections.forEach((section) => {
            processedDataset[section[identifier]] = section;
        });

        return processedDataset;
    }

    public processSections(comparator: any, arraySections: any[], numOrStrKey: any, leafValue: any): any[] {
        arraySections = arraySections.filter((section) =>
            this.doLeafOperation(comparator, leafValue, section, numOrStrKey));
        return arraySections;
    }

    public doLeafOperation(comparator: any, leafValue: any, section: any, numOrStrKey: any): boolean {
        if (comparator === "GT") {
            return section[numOrStrKey] > leafValue;
        } else if (comparator === "EQ") {
            return section[numOrStrKey] === leafValue;
        } else if (comparator === "LT") {
            return section[numOrStrKey] < leafValue;
        } else if (comparator === "IS") {
            return this.processWildcard(leafValue, section, numOrStrKey);
        }
    }

    public processWildcard(leafValue: any, section: any, numOrStrKey: any): boolean {
        let first = false;
        let last = false;
        let str = leafValue;
        if (leafValue.startsWith("*")) {
            str = str.substring(1, str.length);
            first = true;
        }
        if (leafValue.endsWith("*")) {
            str = str.substring(0, str.length - 1);
            last = true;
        }

        if (first && last) {
            return section[numOrStrKey].includes(str);
        } else if (first) {
            return section[numOrStrKey].endsWith(str);
        } else if (last) {
            return section[numOrStrKey].startsWith(str);
        } else {
            return section[numOrStrKey] === str;
        }
    }

    public andHelper(andObj: any[]): any {
        let arrayOfProcessedData: any[] = [];
        andObj.forEach((obj: any) => {
            arrayOfProcessedData.push(this.processOperators(obj));
        });

        let firstDataset = arrayOfProcessedData[0];
        let currentKeys = Object.keys(firstDataset).slice(0);
        arrayOfProcessedData.forEach((processedData) => {
            if (Object.keys(processedData).length !== 0) {
                currentKeys = currentKeys.filter((uuid) => processedData.hasOwnProperty(uuid));
            }
        });
        let datasetResult: { [id: string]: {} } = {};
        currentKeys.forEach((key) => {
            datasetResult[key] = firstDataset[key];
        });
        return datasetResult;
    }

    public orHelper(orObj: any[]): any {
        let arrayOfProcessedData: any[] = [];
        orObj.forEach((obj: any) => {
            arrayOfProcessedData.push(this.processOperators(obj));
        });
        let processedData: { [id: string]: {} } = {};
        arrayOfProcessedData.forEach((data) => {
            Object.assign(processedData, data);
        });
        return processedData;
    }

    public notHelper(obj: any) {
        let inner: any = this.processOperators(Object.values(obj)[0]);
        let datasetsDup: any = {...this.dataset};
        Object.keys(inner).forEach((innerKeys) => {
            delete datasetsDup[innerKeys];
        });
        return datasetsDup;
    }

    // public sort(result: any[], options: any) {
    //         let order: any = options["ORDER"];
    //
    //         result = result.sort(function (a: any, b: any) {
    //             if (a[order] > b[order]) {
    //                 return 1;
    //             }
    //             if (a[order] < b[order]) {
    //                 return -1;
    //             }
    //             return 0;
    //         });
    //     }
    //     return result;
    // }
    //
    public sort(result: any[], options: any) {
        if (options.hasOwnProperty("ORDER")) {
            let order: any = options["ORDER"];

            let sortA = 1;
            let sortB = -1;
            let tiebreak: boolean = false;
            let obj = !(typeof order === "string" || order instanceof String);
            let keys: string[];
            let ordering: any;

            if (obj) {
                keys = order["keys"];
                ordering = keys[0];
                tiebreak = (keys.length > 1);
                if (order["dir"] === "DOWN") {
                    sortA = -1;
                    sortB = 1;
                }
            } else {
                ordering = order;
            }

            result = result.sort(function (a: any, b: any) {
                let ogOrder = ordering;
                let returnVal = 0;
                if (tiebreak && a[ordering] === b[ordering]) {
                    let counter = 1;
                    // assuming all keys are valid
                    while (counter < keys.length && a[ordering] === b[ordering]) {
                        ordering = keys[counter];
                        counter++;
                    }
                }
                if (a[ordering] > b[ordering]) {
                    returnVal = sortA;
                }
                if (a[ordering] < b[ordering]) {
                    returnVal = sortB;
                }
                ordering = ogOrder;


                return returnVal;
            });
        }
        return result;
    }

    public replaceSectionKeys(processedDataset: any, columns: any, result: any[]): any[] {
        Object.keys(processedDataset).forEach((uuid: string) => {
            let sectionData: any = {};
            columns.forEach((sectionKey: string) => {
                let numOrStrKey = sectionKey.substring(sectionKey.indexOf("_") + 1, sectionKey.length);
                sectionData[sectionKey] = processedDataset[uuid][numOrStrKey];
            });
            result.push(sectionData);
        });
        return result;
    }
}

