import {InsightDatasetKind} from "./IInsightFacade";
import * as JSZip from "jszip";
import Log from "../Util";

export class AddHandler {
    protected allDatasetsCourses: {[id: string]: {}};
    protected allDatasetsRooms: {[id: string]: {}};
    protected buildings: string[];
    protected buildingNameAddr: {[id: string]: string[]};
    protected roomsIncomplete: {[id: string]: {[id: string]: {}}};

    constructor(allDatasetsCourses: {[id: string]: {}}, allDatasetsRooms: {[id: string]: {}},
                buildings: string[], buildingNameAddr: {[id: string]: string[]},
                roomsIncomplete: {[id: string]: {[id: string]: {}}}) {
        this.allDatasetsCourses = allDatasetsCourses;
        this.allDatasetsRooms = allDatasetsRooms;
        this.buildings = buildings;
        this.buildingNameAddr = buildingNameAddr;
        this.roomsIncomplete = roomsIncomplete;
    }


    public checkNullUndefined(kind: InsightDatasetKind, content: string, id: string) {
        return kind === null || content === null
            || id === null || kind === undefined || content === undefined
            || id === undefined;
    }

    public parseSections(dataArr: any[], sectionDatasets: { [p: string]: {} }) {
        dataArr.forEach((data) => {
            try {
                this.createSections(JSON.parse(data), sectionDatasets);
            } catch (e) {
                Log.trace("Invalid file!!!");
            }
        });
    }

    public invalidZip(zip2: JSZip, kind: InsightDatasetKind) {
        if (kind === InsightDatasetKind.Courses) {
            return Object.keys(zip2.files).length === 0 ||
                !Object.keys(zip2.files).every((key) => key.startsWith("courses/"));
        } else {
            return Object.keys(zip2.files).length === 0 ||
                !Object.keys(zip2.files).every((key) => key.startsWith("rooms/")) ||
                !Object.keys(zip2.files).includes("rooms/index.htm");
        }
    }

    public createSections(obj: any, sectionDatasets: { [p: string]: {} }) {
        for (let section of obj.result) {
            if (this.hasAllKeys(section)) {

                // construct section object
                let courseSection = this.createSection(section);

                // add section obj to dictionary by uuid
                try {
                    sectionDatasets[courseSection.uuid] = courseSection;
                } catch (e) {
                    Log.trace(e);
                }

            }
        }
    }

    public hasAllKeys(section: any) {
        return section.hasOwnProperty("Title") && section.hasOwnProperty("Course") &&
            section.hasOwnProperty("Audit") && section.hasOwnProperty("Year") &&
            section.hasOwnProperty("Professor") && section.hasOwnProperty("Pass") &&
            section.hasOwnProperty("Fail") && section.hasOwnProperty("Avg") &&
            section.hasOwnProperty("id") && section.hasOwnProperty("Subject");
    }

    public createSection(section: any) {
        if (section["Section"] === "overall") {
            section["Year"] = 1900;
        }
        return {
            title: section["Title"],
            id: section["Course"].toString(),
            pass: section["Pass"],
            avg: section["Avg"],
            fail: section["Fail"],
            audit: section["Audit"],
            year: parseInt(section["Year"], 10),
            uuid: section["id"].toString(),
            dept: section["Subject"],
            instructor: section["Professor"]
        };
    }

    // source: https://stackoverflow.com/questions/10261986/how-to-detect-string-which-contains-only-spaces
    public onlyWhitespace(str: string): boolean {
        return !str.replace(/\s/g, "").length;
    }

    public validDataset(id: string, kind: InsightDatasetKind) {
        return id.length === 0 || id.includes("_") || this.onlyWhitespace(id) ||
            this.allDatasetsCourses.hasOwnProperty(id) || kind === null || kind === undefined
            || this.allDatasetsRooms.hasOwnProperty(id);
    }
}
