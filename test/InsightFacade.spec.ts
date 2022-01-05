import * as chai from "chai";
import {expect} from "chai";
import * as fs from "fs-extra";
import * as chaiAsPromised from "chai-as-promised";
import {InsightDataset, InsightDatasetKind, InsightError, NotFoundError} from "../src/controller/IInsightFacade";
import InsightFacade from "../src/controller/InsightFacade";
import Log from "../src/Util";
import TestUtil from "./TestUtil";

// This should match the schema given to TestUtil.validate(..) in TestUtil.readTestQueries(..)
// except 'filename' which is injected when the file is read.
export interface ITestQuery {
    title: string;
    query: any;  // make any to allow testing structurally invalid queries
    isQueryValid: boolean;
    result: any;
    filename: string;  // This is injected when reading the file
}

describe("InsightFacade Add/Remove/List Dataset", function () {
    // Reference any datasets you've added to test/data here and they will
    // automatically be loaded in the 'before' hook.
    const datasetsToLoad: { [id: string]: string } = {
        "courses": "./test/data/courses.zip",
        "notzip" : "./test/data/notzip.txt",
        "coursesB": "./test/data/coursesB.zip",
        "coursesA": "./test/data/coursesA.zip",
        "wrongdirectory": "./test/data/wrongdirectory.zip",
        "underscore_": "./test/data/underscore_.zip",
        "emptyzip": "./test/data/emptyzip.zip",
        " ": "./test/data/whitespace.zip",
        "": "./test/data/emptyname.zip",
        "withnotJSON": "./test/data/withnotJSON.zip",
        "allnotJSON": "./test/data/allnotJSON.zip",
        "novalidsection": "./test/data/novalidsection.zip",
        "courses_underscore": "./test/data/courses_underscore.zip",
        "nonJSONFile": "./test/data/nonjsonfile.zip",
        "invalidFormat": "./test/data/invalidformat.zip",
        "emptyFile": "./test/data/emptyfile.zip",
        "randomName": "./test/data/randomname.zip", // contains 3 course files
        "oneInvalidOthersValid": "./test/data/oneinvalidothersvalid.zip", // contains one invalid file, others are ok
        "noValidCourseSection": "./test/data/novalidcoursesection.zip", // no course section inside json file
        "oneCourse39Sections": "./test/data/onecourse39sections.zip",
        "!@#$%^&*()+{}[];',./": "./test/data/onecourse39sections.zip", // id that has special characters
        "rooms": "./test/data/rooms.zip",
        "noindex": "./test/data/noindex.zip",
        "norooms": "./test/data/norooms.zip",
        "buildingwrongtype": "./test/data/buildingwrongtype.zip"
    };

    let datasets: { [id: string]: string } = {};
    let insightFacade: InsightFacade;
    const cacheDir = __dirname + "/../data";

    before(function () {
        // This section runs once and loads all datasets specified in the datasetsToLoad object
        // into the datasets object
        Log.test(`Before all`);
        chai.use(chaiAsPromised);
        if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(cacheDir);
        }
        for (const id of Object.keys(datasetsToLoad)) {
            datasets[id] = fs.readFileSync(datasetsToLoad[id]).toString("base64");
        }
        try {
            insightFacade = new InsightFacade();
        } catch (err) {
            Log.error(err);
        }
    });

    beforeEach(function () {
        Log.test(`BeforeTest: ${this.currentTest.title}`);
    });

    after(function () {
        Log.test(`After: ${this.test.parent.title}`);
    });

    afterEach(function () {
        // This section resets the data directory (removing any cached data) and resets the InsightFacade instance
        // This runs after each test, which should make each test independent from the previous one
        Log.test(`AfterTest: ${this.currentTest.title}`);
        try {
            fs.removeSync(cacheDir);
            fs.mkdirSync(cacheDir);
            insightFacade = new InsightFacade();
        } catch (err) {
            Log.error(err);
        }
    });


    // This is a unit test. You should create more like this!
// it("not zip", function () {
//     const id: string = "notzip";
//     const futureResult: Promise<string[]> = insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
//     return expect(futureResult).to.eventually.be.rejectedWith(InsightError);
// });
//
// it("Should add a valid dataset", function () {
//     const id: string = "courses";
//     const expected: string[] = [id];
//     const futureResult: Promise<string[]> = insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
//     return expect(futureResult).to.eventually.deep.equal(expected);
// });
//
// it("Should reject for wrong directory", function () {
//     const id: string = "wrongdirectory";
//     const futureResult: Promise<string[]> = insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
//     return expect(futureResult).to.eventually.be.rejectedWith(InsightError);
// });
//
// it("Should reject for if no valid course section", function () {
//     const id: string = "emptyzip";
//     const futureResult: Promise<string[]> = insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
//     return expect(futureResult).to.eventually.be.rejectedWith(InsightError);
// });
//
// it("Should contain ids of all added datasets", function () {
//     const idA: string = "coursesA";
//     const idB: string = "coursesB";
//     const futureResultA: Promise<string[]> =
//         insightFacade.addDataset(idA, datasets[idA], InsightDatasetKind.Courses);
//     const futureResultB: Promise<string[]> =
//         futureResultA.then((result) => {
//             expect(result).to.deep.equal([idA]);
//             return insightFacade.addDataset(idB, datasets[idB], InsightDatasetKind.Courses);
//         });
//     return expect(futureResultB).to.eventually.deep.include.members([idA, idB]);
// });
//
// it("Should reject if id contains underscore", function () {
//     const id: string = "underscore_";
//     const futureResult: Promise<string[]> = insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
//     return expect(futureResult).to.eventually.be.rejectedWith(InsightError);
// });
//
// it("Should reject if id is only whitespace", function () {
//     const id: string = " ";
//     const futureResult: Promise<string[]> = insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
//     return expect(futureResult).to.eventually.be.rejectedWith(InsightError);
// });
//
// it("Should reject if id is empty", function () {
//     const id: string = "";
//     const futureResult: Promise<string[]> = insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
//     return expect(futureResult).to.eventually.be.rejectedWith(InsightError);
// });
//
// it("Should reject if id already in the dataset", function () {
//     const idA: string = "coursesA";
//     const expectedA: string[] = [idA];
//     const futureResultA: Promise<string[]> =
//         insightFacade.addDataset(idA, datasets[idA], InsightDatasetKind.Courses);
//     const futureResultAA: Promise<string[]> =
//         futureResultA.then((result) => {
//             expect(result).to.deep.equal(expectedA);
//             return insightFacade.addDataset(idA, datasets[idA], InsightDatasetKind.Courses);
//         });
//     return expect(futureResultAA).to.eventually.be.rejectedWith(InsightError);
// });
//
// it("Should fulfill if one file is not JSON", function () {
//     const id: string = "withnotJSON";
//     const expected: string[] = [id];
//     const futureResult: Promise<string[]> = insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
//     return expect(futureResult).to.eventually.deep.equal(expected);
// });
//
// it("Should reject if all files are not JSON", function () {
//     const id: string = "allnotJSON";
//     const futureResult: Promise<string[]> = insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
//     return expect(futureResult).to.eventually.be.rejectedWith(InsightError);
// });
//
// it("Should reject if there are no valid sections", function () {
//     const id: string = "novalidsection";
//     const futureResult: Promise<string[]> = insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
//     return expect(futureResult).to.eventually.be.rejectedWith(InsightError);
// });
//
// it("Should reject if type null", function () {
//     const id: string = "courses";
//     const futureResult: Promise<string[]> = insightFacade.addDataset(id, datasets[id], null);
//     return expect(futureResult).to.eventually.be.rejectedWith(InsightError);
// });
//
// it("Should add a valid dataset for rooms", function () {
//     const id: string = "rooms";
//     const expected: string[] = [id];
//     const futureResult: Promise<string[]> = insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms);
//     return expect(futureResult).to.eventually.deep.equal(expected);
// });
//
//
// it("not zip rooms", function () {
//     const id: string = "notzip";
//     const futureResult: Promise<string[]> = insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms);
//     return expect(futureResult).to.eventually.be.rejectedWith(InsightError);
// });
//
// it("Should reject for wrong directory rooms", function () {
//     const id: string = "coursesA";
//     const futureResult: Promise<string[]> = insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms);
//     return expect(futureResult).to.eventually.be.rejectedWith(InsightError);
// });
//
// it("Should reject for missing index.htm file", function () {
//     const id: string = "noindex";
//     const futureResult: Promise<string[]> = insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms);
//     return expect(futureResult).to.eventually.be.rejectedWith(InsightError);
// });
//
// it("Should reject for no valid rooms", function () {
//     const id: string = "norooms";
//     const futureResult: Promise<string[]> = insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms);
//     return expect(futureResult).to.eventually.be.rejectedWith(InsightError);
// });
//
// it("Should resolve for a wrong building file type", function () {
//     const id: string = "buildingwrongtype";
//     const expected: string[] = [id];
//     const futureResult: Promise<string[]> = insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms);
//     return expect(futureResult).to.eventually.deep.equal(expected);
// });
//
//
// // remove dataset
// it("Should reject removing whitespace id", function () {
//     const id1: string = "courses";
//     const id2: string = " ";
//     const futureResultAdd: Promise<string[]> =
//         insightFacade.addDataset(id1, datasets[id1], InsightDatasetKind.Courses);
//     const futureResultRemove: Promise<string> =
//         futureResultAdd.then((result) => {
//             expect(result).to.deep.equal([id1]);
//             return insightFacade.removeDataset(id2);
//         });
//     return expect(futureResultRemove).to.eventually.be.rejectedWith(InsightError);
// });
//
// it("Should reject removing _ id", function () {
//     const id1: string = "courses";
//     const id2: string = "underscore_";
//     const futureResultAdd: Promise<string[]> =
//         insightFacade.addDataset(id1, datasets[id1], InsightDatasetKind.Courses);
//     const futureResultRemove: Promise<string> =
//         futureResultAdd.then((result) => {
//             expect(result).to.deep.equal([id1]);
//             return insightFacade.removeDataset(id2);
//         });
//     return expect(futureResultRemove).to.eventually.be.rejectedWith(InsightError);
// });
//
// it("Should reject empty id", function () {
//     const id1: string = "courses";
//     const id2: string = "";
//     const futureResultAdd: Promise<string[]> =
//         insightFacade.addDataset(id1, datasets[id1], InsightDatasetKind.Courses);
//     const futureResultRemove: Promise<string> =
//         futureResultAdd.then((result) => {
//             expect(result).to.deep.equal([id1]);
//             return insightFacade.removeDataset(id2);
//         });
//     return expect(futureResultRemove).to.eventually.be.rejectedWith(InsightError);
// });
//
// it("Should reject if id not found", function () {
//     const id1: string = "courses";
//     const id2: string = "notcourses";
//     const expectedAdd: string[] = [id1];
//     const futureResultAdd: Promise<string[]> =
//         insightFacade.addDataset(id1, datasets[id1], InsightDatasetKind.Courses);
//     const futureResultRemove: Promise<string> =
//         futureResultAdd.then((result) => {
//             expect(result).to.deep.equal(expectedAdd);
//             return insightFacade.removeDataset(id2);
//         });
//     return expect(futureResultRemove).to.eventually.be.rejectedWith(NotFoundError);
// });
//
// it("Should reject removing whitespace id room", function () {
//     const id1: string = "rooms";
//     const id2: string = " ";
//     const futureResultAdd: Promise<string[]> =
//         insightFacade.addDataset(id1, datasets[id1], InsightDatasetKind.Rooms);
//     const futureResultRemove: Promise<string> =
//         futureResultAdd.then((result) => {
//             expect(result).to.deep.equal([id1]);
//             return insightFacade.removeDataset(id2);
//         });
//     return expect(futureResultRemove).to.eventually.be.rejectedWith(InsightError);
// });
//
// it("Should reject removing _ id room", function () {
//     const id1: string = "rooms";
//     const id2: string = "underscore_";
//     const futureResultAdd: Promise<string[]> =
//         insightFacade.addDataset(id1, datasets[id1], InsightDatasetKind.Rooms);
//     const futureResultRemove: Promise<string> =
//         futureResultAdd.then((result) => {
//             expect(result).to.deep.equal([id1]);
//             return insightFacade.removeDataset(id2);
//         });
//     return expect(futureResultRemove).to.eventually.be.rejectedWith(InsightError);
// });
//
// it("Should reject empty id room", function () {
//     const id1: string = "rooms";
//     const id2: string = "";
//     const futureResultAdd: Promise<string[]> =
//         insightFacade.addDataset(id1, datasets[id1], InsightDatasetKind.Rooms);
//     const futureResultRemove: Promise<string> =
//         futureResultAdd.then((result) => {
//             expect(result).to.deep.equal([id1]);
//             return insightFacade.removeDataset(id2);
//         });
//     return expect(futureResultRemove).to.eventually.be.rejectedWith(InsightError);
// });
//
// it("Should reject if id not found room", function () {
//     const id1: string = "rooms";
//     const id2: string = "notcourses";
//     const expectedAdd: string[] = [id1];
//     const futureResultAdd: Promise<string[]> =
//         insightFacade.addDataset(id1, datasets[id1], InsightDatasetKind.Rooms);
//     const futureResultRemove: Promise<string> =
//         futureResultAdd.then((result) => {
//             expect(result).to.deep.equal(expectedAdd);
//             return insightFacade.removeDataset(id2);
//         });
//     return expect(futureResultRemove).to.eventually.be.rejectedWith(NotFoundError);
// });
//
// // list dataset
//
// it("Should return empty if no datasets added", function () {
//     const array: InsightDataset[] = [];
//     return expect(insightFacade.listDatasets()).to.eventually.deep.equal(array);
// });
//
//
// it("Invalid dataset containing only non-JSON file", function () {
//     const id: string = "nonJSONFile";
//     const futureResult: Promise<string[]> = insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
//     return expect(futureResult).to.eventually.be.rejectedWith(InsightError);
// });
// it("Invalid dataset containing file with non-JSON format", function () {
//     const id: string = "invalidFormat";
//     const futureResult: Promise<string[]> = insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
//     return expect(futureResult).to.eventually.be.rejectedWith(InsightError);
// });
// it("Invalid dataset containing file with no JSON object", function () {
//     const id: string = "emptyFile";
//     const futureResult: Promise<string[]> = insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
//     return expect(futureResult).to.eventually.be.rejectedWith(InsightError);
// });
// it("Invalid dataset containing folder that is not named courses", function () {
//     const id: string = "randomName";
//     const futureResult: Promise<string[]> = insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
//     return expect(futureResult).to.eventually.be.rejectedWith(InsightError);
// });
// it("Valid dataset containing only one invalid format file, others are valid files", function () {
//     const id: string = "oneInvalidOthersValid";
//     const expected: string[] = [id];
//     const futureResult: Promise<string[]> = insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
//     return expect(futureResult).to.eventually.deep.equal(expected);
// });
// it("Invalid dataset containing empty string id", function () {
//     const id: string = "";
//     const futureResult: Promise<string[]> = insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
//     return expect(futureResult).to.eventually.be.rejectedWith(InsightError);
// });
// it("Invalid dataset containing rooms kind", function () {
//     const id: string = "courses";
//     const futureResult: Promise<string[]> = insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms);
//     return expect(futureResult).to.eventually.be.rejectedWith(InsightError);
// });
// it("Invalid dataset containing not course (nor room) kind", function () {
//     const id: string = "courses";
//     const futureResult: Promise<string[]> = insightFacade.addDataset(id, datasets[id], null);
//     return expect(futureResult).to.eventually.be.rejectedWith(InsightError);
// });
//
// it("Correct format and id, but no course sections", function () {
//     const id: string = "noValidCourseSection";
//     const futureResult: Promise<string[]> = insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
//     return expect(futureResult).to.eventually.be.rejectedWith(InsightError);
// });
//
// it ("Add valid dataset where id has special characters and not letters", function () {
//     const id: string = "!@#$%^&*()+{}[];',./";
//     const expected: string[] = [id];
//     const futureResult: Promise<string[]> = insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
//     return expect(futureResult).to.eventually.deep.equal(expected);
// });
//
//
// // REMOVE DATASET
// it("Removing using id containing underscore", function () {
//     const id: string = "course_underscore";
//     const futureResult: Promise<string> = insightFacade.removeDataset(id);
//     return expect(futureResult).to.eventually.be.rejectedWith(InsightError);
// });
// it("Removing using id containing only whitespace", function () {
//     const id: string = " ";
//     const futureResult: Promise<string> = insightFacade.removeDataset(id);
//     return expect(futureResult).to.eventually.be.rejectedWith(InsightError);
// });
// it("Removing using empty string id", function () {
//     const id: string = "";
//     const futureResult: Promise<string> = insightFacade.removeDataset(id);
//     return expect(futureResult).to.eventually.be.rejectedWith(InsightError);
// });
// it("Trying to remove dataset that has not been added", function () {
//     const id: string = "courses";
//     const futureResult: Promise<string> = insightFacade.removeDataset(id);
//     return expect(futureResult).to.eventually.be.rejectedWith(NotFoundError);
// });
//
//
// // LIST DATASETS
//
// it("List datasets from rooms", function () {
//     const id: string = "rooms";
//     const insightDataset: InsightDataset = {
//         id: "rooms",
//         kind: InsightDatasetKind.Rooms,
//         numRows: 364
//     };
//     const resultOfAdd: Promise<string[]> = insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms);
//     const resultOfListing: Promise<InsightDataset[]> = resultOfAdd.then(() => {
//         return insightFacade.listDatasets();
//     });
//     return expect(resultOfListing).to.eventually.deep.include.members([insightDataset]);
// });
//
// it("List datasets from courses (64612)", function () {
//     const id: string = "courses";
//     const insightDataset: InsightDataset = {
//         id: "courses",
//         kind: InsightDatasetKind.Courses,
//         numRows: 64612
//     };
//     const resultOfAdd: Promise<string[]> = insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
//     const resultOfListing: Promise<InsightDataset[]> = resultOfAdd.then(() => {
//         return insightFacade.listDatasets();
//     });
//     return expect(resultOfListing).to.eventually.deep.include.members([insightDataset]);
// });
//
// it("List datasets from two datasets (64612) and (39) rows", function () {
//     const id1: string = "courses";
//     const id2: string = "oneCourse39Sections";
//     const insightDataset1: InsightDataset = {
//         id: id1,
//         kind: InsightDatasetKind.Courses,
//         numRows: 64612
//     };
//     const insightDataset2: InsightDataset = {
//         id: id2,
//         kind: InsightDatasetKind.Courses,
//         numRows: 39
//     };
//     const expected: InsightDataset[] = [insightDataset1, insightDataset2];
//     const firstAdd: Promise<string[]> = insightFacade.addDataset(id1, datasets[id1], InsightDatasetKind.Courses);
//     const secondAdd: Promise<string[]> = firstAdd.then((res) => {
//         expect(res).to.deep.include.members([id1]);
//         return insightFacade.addDataset(id2, datasets[id2], InsightDatasetKind.Courses);
//     });
//     const resultOfListing: Promise<InsightDataset[]> = secondAdd.then((res) => {
//         expect(res).to.deep.include.members([id1, id2]);
//         return insightFacade.listDatasets();
//     });
//     return expect(resultOfListing).to.eventually.deep.include.members(expected);
// } );
});

/*
 * This test suite dynamically generates tests from the JSON files in test/queries.
 * You should not need to modify it; instead, add additional files to the queries directory.
 * You can still make tests the normal way, this is just a convenient tool for a majority of queries.
 */
describe("InsightFacade PerformQuery", () => {
    const datasetsToQuery: { [id: string]: {path: string, kind: InsightDatasetKind} } = {
        courses: {path: "./test/data/courses.zip", kind: InsightDatasetKind.Courses},
        rooms: {path: "./test/data/rooms.zip", kind: InsightDatasetKind.Rooms}
    };
    let insightFacade: InsightFacade;
    let testQueries: ITestQuery[] = [];

    // Load all the test queries, and call addDataset on the insightFacade instance for all the datasets
    before(function () {
        chai.use(chaiAsPromised);
        Log.test(`Before: ${this.test.parent.title}`);

        // Load the query JSON files under test/queries.
        // Fail if there is a problem reading ANY query.
        try {
            testQueries = TestUtil.readTestQueries();
        } catch (err) {
            expect.fail("", "", `Failed to read one or more test queries. ${err}`);
        }

        // Load the datasets specified in datasetsToQuery and add them to InsightFacade.
        // Will fail* if there is a problem reading ANY dataset.
        const loadDatasetPromises: Array<Promise<string[]>> = [];
        insightFacade = new InsightFacade();
        for (const id of Object.keys(datasetsToQuery)) {
            const ds = datasetsToQuery[id];
            const data = fs.readFileSync(ds.path).toString("base64");
            loadDatasetPromises.push(insightFacade.addDataset(id, data, ds.kind));
        }
        return Promise.all(loadDatasetPromises);
    });

    beforeEach(function () {
        Log.test(`BeforeTest: ${this.currentTest.title}`);
    });

    after(function () {
        Log.test(`After: ${this.test.parent.title}`);
    });

    afterEach(function () {
        Log.test(`AfterTest: ${this.currentTest.title}`);
    });

    // Dynamically create and run a test for each query in testQueries
    // Creates an extra "test" called "Should run test queries" as a byproduct. Don't worry about it
    it("Should run test queries", function () {
        describe("Dynamic InsightFacade PerformQuery tests", function () {
            for (const test of testQueries) {
                it(`[${test.filename}] ${test.title}`, function () {
                    const futureResult: Promise<any[]> = insightFacade.performQuery(test.query);
                    return TestUtil.verifyQueryResult(futureResult, test);
                });
            }
        });
    });
});
