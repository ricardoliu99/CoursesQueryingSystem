import { Decimal } from "decimal.js";
import Log from "../Util";

export class TransformHandler {
    private dataset: any;
    private mKeys: any[];
    private sKeys: any[];
    private groupKeys: any[];
    private tokenKeys: any[];
    private transformation: any;

    constructor(dataset: any, mKeys: any, sKeys: any, groupKeys: any, tokenKeys: any, transformation: any) {
        this.dataset = dataset;
        this.mKeys = mKeys;
        this.sKeys = sKeys;
        this.groupKeys = groupKeys;
        this.tokenKeys = tokenKeys;
        this.transformation = transformation;
    }

    public performTransformations(processedDataset: any) {
        processedDataset = Object.values(this.applyOperations(this.createGroupMap(processedDataset)));
        return processedDataset;
    }

    public createGroupMap(processedDataset: any): any {
        let groupMap: any = {};
        let keys: string[] = this.tokenKeys.concat(this.groupKeys);
        Object.keys(processedDataset).forEach((id: any) => {
            let sectionObj = processedDataset[id];
            let reducedSection: any = {};
            let groupMapKey: any = {};
            keys.forEach((key) => {
                let reducedKey = key.substring(key.indexOf("_") + 1, key.length);
                if (sectionObj.hasOwnProperty(reducedKey)) {
                    if (this.groupKeys.includes(key)) {
                        groupMapKey[reducedKey] = sectionObj[reducedKey];
                    }
                    reducedSection[reducedKey] = sectionObj[reducedKey];
                }
            });
            let groupMapKeyStr = JSON.stringify(groupMapKey);
            if (!groupMap.hasOwnProperty(groupMapKeyStr)) {
                let innerMap: any = {};
                groupMap[groupMapKeyStr] = innerMap;
            }
            groupMap[groupMapKeyStr][id] = reducedSection;
        });

        return groupMap;
    }

    public applyOperations(groupMap: any): any {
        let result: any = {};
        if (this.transformation["APPLY"].length !== 0) {
            let applyArr = this.transformation["APPLY"].slice(0);
            applyArr.forEach((applyObj: any) => {
                result = this.doApplyOperation({...groupMap}, applyObj);
            });
        } else {
            result = this.groupNoApply({...groupMap});
        }

        return result;
    }

    public groupNoApply(processedDataset: any): any {
        let result: any[] = [];
        Object.keys(processedDataset).forEach((key) => {
            let tempObj: any = {};
            let obj = processedDataset[key];
            let innerObj =  obj[Object.keys(obj)[0]];
            Object.keys(innerObj).forEach((value, index) => {
                tempObj[value] = Object.values(innerObj)[index];
            });
            result.push(tempObj);
        });
        return result;
    }

    public doApplyOperation(groupMap: any, applyObj: any): any {
        let result = groupMap;
        let applyKey = Object.keys(applyObj[Object.keys(applyObj)[0]])[0];
        let applyValue: any = Object.values(applyObj[Object.keys(applyObj)[0]])[0];
        let applyValueRe = applyValue.substring(applyValue.indexOf("_") + 1, applyValue.length);
        let customKey = Object.keys(applyObj)[0];
        let isMKey: boolean = this.mKeys.includes(applyValueRe);
        let isSKey: boolean = this.sKeys.includes(applyValueRe);

        if (applyKey === "MAX" && isMKey) {
            result = this.applyMaxMin(result, customKey, applyValueRe, applyKey);
        } else if (applyKey === "MIN" && isMKey) {
            result = this.applyMaxMin(result, customKey, applyValueRe, applyKey);
        } else if (applyKey === "AVG" && isMKey) {
            result = this.applySumAvg(result, customKey, applyValueRe, applyKey);
        } else if (applyKey === "SUM" && isMKey) {
            result = this.applySumAvg(result, customKey, applyValueRe, applyKey);
        } else if (applyKey === "COUNT" && (isMKey || isSKey)) {
            result = this.applyCount(result, customKey, applyValueRe);
        }

        return result;
    }

    public applyCount(groupMap: any, customKey: any, applyValueRe: any): any {
        let keys = Object.keys(groupMap);
        keys.forEach((key) => {
            let soFar: number[] = [];
            let innerMap = groupMap[key];
            Object.values(innerMap).forEach((section: any) => {
                if (!soFar.includes(section[applyValueRe])) {
                    soFar.push(section[applyValueRe]);
                }
            });
            let first: any = Object.values(innerMap)[0];
            first[customKey] = soFar.length;
            groupMap[key] = first;
        });
        return groupMap;
    }

    public applySumAvg (groupMap: any, customKey: any, applyValueRe: any, type: any): any {
        let keys = Object.keys(groupMap);
        keys.forEach((key) => {
            let sum = new Decimal(0);
            let count = 0;
            let innerMap = groupMap[key];
            Object.values(innerMap).forEach((section: any) => {
                let value = new Decimal(section[applyValueRe]);
                sum = Decimal.add(sum, value);
                count++;
            });
            let result;

            if (type === "AVG" && count !== 0) {
                result = sum.toNumber() / count;
                result = Number(result.toFixed(2));
            } else {
                result = Number(sum.toFixed(2));
            }

            let first: any = Object.values(innerMap)[0];
            first[customKey] = result;
            groupMap[key] = first;
        });
        return groupMap;
    }

    public applyMaxMin (groupMap: any, customKey: any, applyValueRe: any, type: any): any {
        let keys = Object.keys(groupMap);
        keys.forEach((key) => {
            let innerMap = groupMap[key];
            let m: any = Object.values(innerMap)[0]; // current max or min
            Object.values(innerMap).forEach((section: any) => {
                if (type === "MIN") {
                    if (m[applyValueRe] >= section[applyValueRe]) {
                        m = section;
                    }
                } else if (type === "MAX") {
                    if (m[applyValueRe] <= section[applyValueRe]) {
                        m = section;
                    }
                }
            });
            Object.values(innerMap).forEach((section: any) => {
                section[customKey] = m[applyValueRe];
            });

            groupMap[key] = m;
        });
        return groupMap;
    }
}
