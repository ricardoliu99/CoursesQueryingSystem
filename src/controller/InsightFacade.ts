import Log from "../Util";
import {
    IInsightFacade,
    InsightDataset,
    InsightDatasetKind,
    InsightError,
    NotFoundError,
    ResultTooLargeError
} from "./IInsightFacade";
import * as JSZip from "jszip";
import * as fs from "fs-extra";
import {QueryHandler} from "./QueryHandler";
import {AddSubHandler} from "./AddSubHandler";
import {SyntaxChecker} from "./SyntaxChecker";
import {TransformHandler} from "./TransformHandler";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
    private allDatasetsCourses: {[id: string]: {}};
    private allDatasetsRooms: {[id: string]: {}};
    private listOfQueryIDs: any[] = [];
    private rejectInQuery: boolean = false;
    private buildings: string[];
    private buildingNameAddr: {[id: string]: string[]};
    private roomsIncomplete: {[id: string]: {[id: string]: {}}};

    private allDatasets: {
        courses: any;
        rooms: any;
    };

    constructor() {
        this.allDatasetsCourses = {};
        this.allDatasetsRooms = {};
        this.buildings = [];
        this.buildingNameAddr = {};
        this.roomsIncomplete = {};
        this.allDatasets = {
            courses: this.allDatasetsCourses,
            rooms: this.allDatasetsRooms
        };
        Log.trace("InsightFacadeImpl::init()");
    }

    // TODO: refactor maybe...
    // source that vs this: https://github.com/microsoft/TypeScript/wiki/%27this%27-in-TypeScript
    // source JSZip: https://stackoverflow.com/questions/39322964/extracting-zipped-files-using-jszip-in-javascript
    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
        let that = this;
        let AH: AddSubHandler = new AddSubHandler(this.allDatasetsCourses, this.allDatasetsRooms, this.buildings,
            this.buildingNameAddr, this.roomsIncomplete);

        that.resetBuildingData(that);

        let zip = new JSZip();
        let sectionDatasets: { [id: string]: {} } = {};

        return new Promise<string[]>((resolve, reject) => {
            this.reloadAdd();

            if (AH.checkNullUndefined(kind, content, id) || AH.validDataset(id, kind)) {
                reject(new InsightError());
            }

            zip.loadAsync(content, {base64: true}).then(function (zip2) {
                let listOfPromises: any[] = [];
                if (AH.invalidZip(zip2, kind)) {
                    return reject(new InsightError());
                }
                AH.promisifyFiles(zip, listOfPromises, zip2);

                Promise.all(listOfPromises).then(function (dataArr) {
                    AH.dataParser(kind, dataArr, sectionDatasets);
                }).then(function () {
                    that.processInsightData(kind, that, id, sectionDatasets, reject, resolve, zip2, AH);
                });
            }).catch(() => {
                reject(new InsightError());
            });
        });
    }

    private processInsightData(kind: InsightDatasetKind, that: this, id: string, sectionDatasets: { [p: string]: {} },
                               reject: (reason?: any) => void,
                               resolve: (value?: (PromiseLike<string[]> | string[])) => void, zip2: JSZip,
                               AH: AddSubHandler) {
        if (kind === InsightDatasetKind.Courses) {
            that.processCourses(that, id, sectionDatasets, reject, resolve);
        } else {
            that.processRooms(that, zip2, id, reject, resolve, AH);
        }
    }

    private processCourses(that: this, id: string, sectionDatasets: { [p: string]: {} }, reject: (reason?: any) => void,
                           resolve: (value?: (PromiseLike<string[]> | string[])) => void) {
        that.storeSaveCourses(that, id, sectionDatasets);
        if (Object.keys(sectionDatasets).length === 0) {
            reject(new InsightError());
        } else {
            resolve(Object.keys(that.allDatasetsCourses).concat(Object.keys(that.allDatasetsRooms)));
        }
    }

    private processRooms(that: this, zip2: JSZip, id: string, reject: (reason?: any) => void,
                         resolve: (value?: (PromiseLike<string[]> | string[])) => void, AH: AddSubHandler) {
        AH.parseBuildingHtml(zip2).then(function (data: any[]) {
            let listOfGeoLocProms: any[] = [];
            AH.extractRoomsData(data, listOfGeoLocProms);

            Promise.all(listOfGeoLocProms).then(function (geoLocations: any[]) {
                that.storeSaveRooms(that, id, geoLocations, AH);
            }).then(function () {
                if (Object.keys(that.allDatasetsRooms[id]).length === 0) {
                    reject(new InsightError());
                } else {
                    resolve(Object.keys(that.allDatasetsCourses).concat(
                        Object.keys(that.allDatasetsRooms)));
                }
            });
        });
    }

    public storeSaveCourses(that: this, id: string, sectionDatasets: { [p: string]: {} }) {
        that.allDatasetsCourses[id] = sectionDatasets;
        fs.writeFileSync("./data/save.json", JSON.stringify(that.allDatasets));
    }

    public storeSaveRooms(that: this, id: string, geoLocations: any[], AH: AddSubHandler) {
        that.allDatasetsRooms[id] =
            AH.mergeBuildingData(AH.mapGeoLocations(geoLocations));
        fs.writeFileSync("./data/save.json", JSON.stringify(that.allDatasets));
    }

    private resetBuildingData(that: this) {
        that.buildings = [];
        that.buildingNameAddr = {};
        that.roomsIncomplete = {};
    }

    private validRemoveID(id: string) {
        return id.length === 0 || id.includes("_") || !id.replace(/\s/g, "").length;
    }

    public removeDataset(id: string): Promise<string> {
        let that = this;

        if (id === null || id === undefined) {
            return Promise.reject(new InsightError());
        }

        return new Promise<string>((resolve, reject) => {
            if (that.validRemoveID(id)) {
                reject(new InsightError());
            }

            if (!that.allDatasetsCourses.hasOwnProperty(id) && !that.allDatasetsRooms.hasOwnProperty(id)) {
                reject(new NotFoundError());
            } else {
                if (that.allDatasetsCourses.hasOwnProperty(id)) {
                    delete that.allDatasetsCourses[id];
                    fs.writeFileSync("./data/save.json", JSON.stringify(that.allDatasets));
                } else {
                    delete that.allDatasetsRooms[id];
                    fs.writeFileSync("./data/save.json", JSON.stringify(that.allDatasets));
                }
                // delete that.addDatasets.id only removes value, key remains
                resolve(id);
            }
        });
    }

    public performQuery(query: any): Promise<any[]> {
        this.rejectInQuery = false;
        this.listOfQueryIDs = [];
        let processedDataset: any;
        return new Promise<any[]>((resolve, reject) => {
            this.reload(reject);

            let checkSyntax = new SyntaxChecker();
            if (!(checkSyntax.syntaxChecker(query)) ||
                this.datasetNotFound(checkSyntax.getDatasetName(), checkSyntax.getDataSetKind())) {
                reject(new InsightError());
            }

            let where: any = query["WHERE"];
            let columns = query["OPTIONS"]["COLUMNS"];
            let options = query["OPTIONS"];
            let datasetName = checkSyntax.getDatasetName();

            let dataset: any;
            let kind = checkSyntax.getDataSetKind();
            if (kind === InsightDatasetKind.Courses) {
                dataset = this.allDatasetsCourses[datasetName];
            } else {
                dataset = this.allDatasetsRooms[datasetName];
            }

            let QH: QueryHandler = new QueryHandler(dataset, kind);
            if (this.whereEmpty(where)) {
                processedDataset = dataset;
            } else {
                processedDataset = QH.processOperators(where);
            }

            if (query.hasOwnProperty("TRANSFORMATIONS")) {
                let transform: TransformHandler = new TransformHandler(processedDataset, checkSyntax.getMKeys(),
                    checkSyntax.getSKeys(), checkSyntax.getGroupKeys(), checkSyntax.getTokenKeys(),
                    query["TRANSFORMATIONS"]);
                processedDataset = transform.performTransformations(processedDataset);
            }


            if (Object.keys(processedDataset).length <= 5000) {
                let result: any[] = QH.replaceSectionKeys(processedDataset, columns, []);
                resolve(QH.sort(result, options));
            } else {
                reject(new ResultTooLargeError());
            }
        });
    }

    private reload(reject: (reason?: any) => void) {
        if (Object.keys(this.allDatasetsCourses).length === 0 && Object.keys(this.allDatasetsRooms).length === 0) {
            try {
                let data: any = JSON.parse("./data/save.json");
                this.allDatasetsRooms = data["courses"];
                this.allDatasetsCourses = data["rooms"];
            } catch (e) {
                reject(new InsightError());
            }
        }
    }

    private reloadAdd() {
        if (Object.keys(this.allDatasetsCourses).length === 0 && Object.keys(this.allDatasetsRooms).length === 0) {
            try {
                let data: any = JSON.parse("./data/save.json");
                this.allDatasetsRooms = data["courses"];
                this.allDatasetsCourses = data["rooms"];
            } catch (e) {
                Log.trace("did no reload add");
            }
        }
    }

    private datasetNotFound(datasetName: string, datasetKind: InsightDatasetKind) {
        let checkCourses =
            datasetKind === InsightDatasetKind.Courses && Object.keys(this.allDatasetsCourses).includes(datasetName);
        let checkRooms =
            datasetKind === InsightDatasetKind.Rooms && Object.keys(this.allDatasetsRooms).includes(datasetName);
        return !checkCourses && !checkRooms;
    }

    private whereEmpty(where: any) {
        return Object.keys(where).length === 0;
    }

    public listDatasets(): Promise<InsightDataset[]> {
        let that = this;
        let array: InsightDataset[] = [];

        return new Promise<InsightDataset[]>((resolve) => {
            array = that.list(that, [InsightDatasetKind.Courses, InsightDatasetKind.Rooms]);
            resolve(array);
        });
    }

    private list(that: this, kinds: any[]): InsightDataset[] {
        let array: InsightDataset[] = [];
        let datasets: any;

        kinds.forEach((kind) => {
            if (kind === InsightDatasetKind.Courses) {
                datasets = that.allDatasetsCourses;
            } else {
                datasets = that.allDatasetsRooms;
            }

            Object.keys(datasets).forEach((key) => {
                let dataset = {
                    id: key,
                    kind: kind,
                    numRows: Object.keys(datasets[key]).length
                };

                array.push(dataset);
            });

        });

        return array;
    }
}
