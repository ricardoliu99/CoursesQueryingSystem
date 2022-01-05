import * as JSZip from "jszip";
import Log from "../Util";
import {AddHandler} from "./AddHandler";
import {InsightDatasetKind} from "./IInsightFacade";
import * as http from "http";

export class AddSubHandler extends AddHandler {
    public extractRoomsData(data: any[], listOfGeoLocProms: any[]) {
        let mapOfNameHtml: {[id: string]: any} = this.processHtmlNames(data);
        let buildingHTMs: {[id: string]: any} = {};
        let buildingTbody: {[id: string]: any} = {};

        this.parseHTMLFiles(mapOfNameHtml, buildingHTMs);
        this.extractIncompleteRoomInfo(buildingHTMs, buildingTbody);
        this.geoLocationPromises(listOfGeoLocProms);
    }


    public dataParser(kind: InsightDatasetKind, dataArr: any[], sectionDatasets: { [p: string]: {} }) {
        if (kind === InsightDatasetKind.Courses) {
            this.parseSections(dataArr, sectionDatasets);
        } else {
            let parsehtm = require("parse5");
            let htm = parsehtm.parse(dataArr[dataArr.length - 1]);
            this.searchBuildings(this.searchTBody(htm));
        }
    }

    public geoLocationPromises(listOfGeoLocationPromises: any[]) {
        Object.keys(this.buildingNameAddr).forEach((building) => {
            listOfGeoLocationPromises.push(this.getGeoLocation(this.buildingNameAddr[building][1],
                building));
        });
    }

    public extractIncompleteRoomInfo(buildinghtms: { [p: string]: any }, buildingtbodies: { [p: string]: any }) {
        Object.keys(buildinghtms).forEach((fileName: any) => {
            let tbody = this.searchTBody(buildinghtms[fileName]);
            if (tbody !== null && tbody !== undefined) {
                this.searchBuildingWrapper(buildinghtms[fileName], fileName);
                buildingtbodies[fileName] = tbody;

                this.roomsIncomplete[fileName] = {};
                this.extractRoomInfo(tbody, fileName);
            }
        });
    }

    public parseHTMLFiles(mapOfNameHtml: { [p: string]: any }, buildinghtms: { [p: string]: any }) {
        Object.keys(mapOfNameHtml).forEach((fileName: any) => {
            let htm: any;
            let parsehtm = require("parse5");
            htm = parsehtm.parse(mapOfNameHtml[fileName]);
            buildinghtms[fileName] = htm;
        });
    }

    public promisifyFiles(zip: JSZip, listOfPromises: any[], zip2: JSZip) {
        Object.keys(zip.files).forEach(function (file) {
            if (file !== "rooms/index.htm") {
                listOfPromises.push(zip2.folder("courses").files[file].async("string"));
            }
        });

        if (Object.keys(zip.files).includes("rooms/index.htm")) {
            listOfPromises.push(zip2.folder("rooms").files["rooms/index.htm"].async("string"));
        }
    }

    public mapGeoLocations(geoLocations: any[]): {[id: string]: {}} {
        let mapOfGeoLocations: {[id: string]: {}} = {};
        let invalidLocations: string[] = [];
        geoLocations.forEach((location) => {
            if (!location.hasOwnProperty("error")) {
                mapOfGeoLocations[location.shortname] = {
                    lat: location.lat,
                    lon: location.lon
                };
            } else {
                invalidLocations.push(location.shortname);
            }
        });

        this.trimBuildingData(invalidLocations);

        return mapOfGeoLocations;
    }

    public trimBuildingData(invalidLocations: string[]) {
        invalidLocations.forEach((building) => {
            if (this.roomsIncomplete.hasOwnProperty(building)) {
                delete this.roomsIncomplete[building];
            }
            if (this.buildingNameAddr.hasOwnProperty(building)) {
                delete this.buildingNameAddr[building];
            }
        });
    }


    public mergeBuildingData(geoLocations: {[id: string]: any}): {[id: string]: {}} {
        let MapOfRoomsComplete: {[id: string]: {}} = {};

        Object.keys(this.buildingNameAddr).forEach((shortname) => {
            Object.keys(this.roomsIncomplete[shortname]).forEach((roomnumber) => {
                let room: any = this.roomsIncomplete[shortname][roomnumber];
                let name = shortname.concat("_").concat(roomnumber);
                let seats: number;
                if (room.seats === "") {
                    seats = 0;
                } else {
                    seats = parseInt(room.seats, 10);
                }
                MapOfRoomsComplete[name] = {
                    fullname: this.buildingNameAddr[shortname][0],
                    shortname: shortname,
                    number: roomnumber,
                    name: name,
                    address: this.buildingNameAddr[shortname][1],
                    lat: geoLocations[shortname].lat,
                    lon: geoLocations[shortname].lon,
                    seats: seats,
                    type: room.type,
                    furniture: room.furniture,
                    href: room.href
                };
            });
        });

        return MapOfRoomsComplete;
    }


    public getGeoLocation(address: string, building: string): Promise<any> {
        let url = "http://cs310.students.cs.ubc.ca:11316/api/v1/project_team097/" + encodeURI(address);

        return new Promise<any>((resolve) => {
            // Source: https://nodejs.org/api/http.html#http_http_get_url_options_callback
            // from the JSON fetching example for http.get(url[, options][, callback])

            http.get(url, (res: any) => {
                const {statusCode} = res;
                const contentType = res.headers["content-type"];

                let error;
                // Any 2xx status code signals a successful response but
                // here we're only checking for 200.
                if (statusCode !== 200) {
                    error = new Error("Request Failed.\n" +
                        `Status Code: ${statusCode}`);
                } else if (!/^application\/json/.test(contentType)) {
                    error = new Error("Invalid content-type.\n" +
                        `Expected application/json but received ${contentType}`);
                }
                if (error) {
                    Log.trace(error.message);
                    // Consume response data to free up memory
                    res.resume();
                    return;
                }

                res.setEncoding("utf8");
                let rawData = "";
                res.on("data", (chunk: any) => {
                    rawData += chunk;
                });
                res.on("end", () => {
                    try {
                        const parsedData = JSON.parse(rawData);
                        parsedData["shortname"] = building;
                        resolve(parsedData);
                    } catch (e) {
                        Log.trace(e.message);
                    }
                });
            }).on("error", (e: any) => {
                Log.trace(`Got error: ${e.message}`);
            });
        });
    }


    public extractRoomInfo(node: any, building: string) {
        if (node.tagName === "tr") {
            this.roomsIncomplete[building][node.childNodes[1].childNodes[1].childNodes[0].value] = {
                seats: (node.childNodes[3].childNodes[0].value).trim(),
                furniture: (node.childNodes[5].childNodes[0].value).trim(),
                type: (node.childNodes[7].childNodes[0].value).trim(),
                href: (node.childNodes[9].childNodes[1].attrs[0].value).trim()
            };
        } else if (node.childNodes !== null && node.childNodes !== undefined && node.childNodes.length !== 0) {
            Object.keys(node.childNodes).forEach((n: any) => {
                this.extractRoomInfo(node.childNodes[n], building);
            });
        }

    }

    // precondition: data.length % 2 == 0
    public processHtmlNames(data: string[]): {[id: string]: any} {
        let map: {[id: string]: any} = {};
        for (let i = 0; i < data.length; i += 2) {
            map[data[i]] = data[i + 1];
        }
        return map;
    }

    public searchBuildingWrapper(node: any, shortName: string) {
        if (node.tagName === "div" && node.attrs[0] !== undefined && node.attrs[0].value === "building-info") {
            if (node.childNodes !== undefined && node.childNodes[1].childNodes !== undefined &&
                node.childNodes[1].childNodes[0].childNodes !== undefined) {
                // full name, address
                this.buildingNameAddr[shortName] =
                    [node.childNodes[1].childNodes[0].childNodes[0].value,
                        node.childNodes[3].childNodes[0].childNodes[0].value];
            }
        } else if (node.childNodes !== null && node.childNodes !== undefined && node.childNodes.length !== 0) {
            Object.keys(node.childNodes).forEach((n: any) => {
                this.searchBuildingWrapper(node.childNodes[n], shortName);
            });
        }
    }

    public searchBuildings(node: any) {
        if (node.tagName === "a") {
            let str: string = node.attrs[0].value;
            let reduced: string = (str).substring("./campus/discover/buildings-and-classrooms/".length, str.length);
            if (!this.buildings.includes(reduced)) {
                this.buildings.push(reduced);
            }
        } else if (node.childNodes !== null && node.childNodes !== undefined && node.childNodes.length !== 0) {
            Object.keys(node.childNodes).forEach((n: any) => {
                this.searchBuildings(node.childNodes[n]);
            });
        }
    }

    public searchTBody(node: any): any {
        let found: any;
        if (node.tagName === "tbody") {
            found = node;
        } else if (node.childNodes !== null && node.childNodes !== undefined && node.childNodes.length !== 0) {
            Object.keys(node.childNodes).forEach((n: any) => {
                let result = this.searchTBody(node.childNodes[n]);
                if (result !== null && result !== undefined) {
                    found = result;
                }
            });
        }
        return found;
    }

    public parseBuildingHtml(zip2: JSZip): Promise<any[]> {
        let buildingsArr: string[] = this.buildings;

        return new Promise<string[]>((resolve) => {
            let listOfPromises: any[] = [];

            Object.keys(zip2.files).forEach(function (file) {
                let path: string = "rooms/campus/discover/buildings-and-classrooms/";
                if (file.length >= path.length && buildingsArr.includes(file.substring(path.length, file.length))) {
                    listOfPromises.push(file.substring(path.length, file.length));
                    listOfPromises.push(zip2.folder("courses").files[file].async("string"));
                }
            });

            Promise.all(listOfPromises).then(function (data) {
                resolve(data);
            });
        });
    }
}
