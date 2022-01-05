import Server from "../src/rest/Server";

import InsightFacade from "../src/controller/InsightFacade";
import chai = require("chai");
import chaiHttp = require("chai-http");
import Response = ChaiHttp.Response;
import {expect} from "chai";
import * as fs from "fs";
import Log from "../src/Util";

describe("Facade D3", function () {

    let facade: InsightFacade = null;
    let server: Server = null;
    let SERVER_URL = "http://localhost:4321";
    let ZIP_FILE_DATA = fs.readFileSync("./test/data/courses.zip");
    let SIMPLE_QUERY = {
        WHERE: {
            GT: {
                courses_avg: 97
            }
        },
        OPTIONS: {
            COLUMNS: [
                "courses_dept",
                "courses_avg"
            ],
            ORDER: "courses_avg"
        }
    };
    let INVALID_QUERY = {
        WWWWWWW: {
            GT: {
                courses_avg: 97
            }
        },
        OPTIONS: {
            COLUMNS: [
                "courses_dept",
                "courses_avg"
            ],
            ORDER: "courses_avg"
        }
    };


    chai.use(chaiHttp);

    before(function () {
        facade = new InsightFacade();
        server = new Server(4321);
        // TODO: start server here once and handle errors properly
        // server.start();
    });

    after(function () {
        // TODO: stop server here once!
    });

    beforeEach(function () {
        // might want to add some process logging here to keep track of what"s going on
        // server.start();
    });

    afterEach(function () {
        // might want to add some process logging here to keep track of what"s going on
        // server.stop();
    });

    // Sample on how to format PUT requests
    /*
    it("PUT test for courses dataset", function () {
        try {
            return chai.request(SERVER_URL)
                .put(ENDPOINT_URL)
                .send(ZIP_FILE_DATA)
                .set("Content-Type", "application/x-zip-compressed")
                .then(function (res: Response) {
                    // some logging here please!
                    expect(res.status).to.be.equal(204);
                })
                .catch(function (err) {
                    // some logging here please!
                    expect.fail();
                });
        } catch (err) {
            // and some more logging here!
        }
    });
    */

    // it("PUT test for courses dataset resolves", function () {
    //     try {
    //         let endpoint = "/dataset/courses/courses";
    //         return chai.request(SERVER_URL)
    //             .put(endpoint)
    //             .send(ZIP_FILE_DATA)
    //             .set("Content-Type", "application/x-zip-compressed")
    //             .then(function (res: Response) {
    //                 expect(res.status).to.be.equal(200);
    //             })
    //             .catch(function () {
    //                 expect.fail();
    //             });
    //     } catch (err) {
    //         Log.trace(err, "!!!");
    //     }
    // });
    //
    // it("POST test for courses dataset resolves", function () {
    //     try {
    //         let endpoint = "/query";
    //         return chai.request(SERVER_URL)
    //             .post(endpoint)
    //             .send(SIMPLE_QUERY)
    //             .then(function (res: Response) {
    //                 expect(res.status).to.be.equal(200);
    //             })
    //             .catch(function () {
    //                 expect.fail();
    //             });
    //     } catch (err) {
    //         Log.trace(err, "!!!");
    //     }
    // });

    // it("POST test for courses dataset rejects on Invalid query", function () {
    //     try {
    //         let endpoint = "/query";
    //         return chai.request(SERVER_URL)
    //             .post(endpoint)
    //             .send(INVALID_QUERY)
    //             .then(function (res: Response) {
    //                 expect.fail();
    //             })
    //             .catch(function (err) {
    //                 expect(err.status).to.be.equal(400);
    //             });
    //     } catch (err) {
    //         Log.trace(err, "!!!");
    //     }
    // });
    //
    //
    // it("PUT test for courses dataset rejects", function () {
    //     try {
    //         let endpoint = "/dataset/courses/courses";
    //         return chai.request(SERVER_URL)
    //             .put(endpoint)
    //             .send(ZIP_FILE_DATA)
    //             .set("Content-Type", "application/x-zip-compressed")
    //             .then(function (res: Response) {
    //                 expect.fail();
    //             })
    //             .catch(function (err) {
    //                 expect(err.status).to.be.equal(400);
    //             });
    //     } catch (err) {
    //         Log.trace(err, "!!!");
    //     }
    // });
    //
    //
    // it("DELETE test for courses dataset rejects", function () {
    //     try {
    //         let endpoint = "/dataset/courses";
    //         return chai.request(SERVER_URL)
    //             .del(endpoint)
    //             .send(ZIP_FILE_DATA)
    //             .set("Content-Type", "application/x-zip-compressed")
    //             .then(function (res: Response) {
    //                 expect(res.status).to.be.equal(200);
    //             })
    //             .catch(function (err) {
    //                 expect.fail();
    //             });
    //     } catch (err) {
    //         Log.trace(err, "!!!");
    //     }
    // });
    //
    // it("POST test for courses dataset rejects", function () {
    //     try {
    //         let endpoint = "/query";
    //         return chai.request(SERVER_URL)
    //             .post(endpoint)
    //             .send(SIMPLE_QUERY)
    //             .then(function (res: Response) {
    //                 expect.fail();
    //             })
    //             .catch(function (err) {
    //                 expect(err.status).to.be.equal(400);
    //             });
    //     } catch (err) {
    //         Log.trace(err, "!!!");
    //     }
    // });
    //
    // it("DELETE test for courses dataset rejects NotFoundError", function () {
    //     try {
    //         let endpoint = "/dataset/courses";
    //         return chai.request(SERVER_URL)
    //             .del(endpoint)
    //             .send(ZIP_FILE_DATA)
    //             .set("Content-Type", "application/x-zip-compressed")
    //             .then(function (res: Response) {
    //                 expect.fail();
    //             })
    //             .catch(function (err) {
    //                 expect(err.status).to.be.equal(404);
    //             });
    //     } catch (err) {
    //         Log.trace(err, "!!!");
    //     }
    // });
    //
    // it("DELETE test for courses dataset rejects InsightError", function () {
    //     try {
    //         let endpoint = "/dataset/_";
    //         return chai.request(SERVER_URL)
    //             .del(endpoint)
    //             .send(ZIP_FILE_DATA)
    //             .set("Content-Type", "application/x-zip-compressed")
    //             .then(function (res: Response) {
    //                 expect.fail();
    //             })
    //             .catch(function (err) {
    //                 expect(err.status).to.be.equal(400);
    //             });
    //     } catch (err) {
    //         Log.trace(err, "!!!");
    //     }
    // });
    //
    //
    // it("GET test for courses dataset rejects", function () {
    //     try {
    //         let endpoint = "/datasets";
    //         return chai.request(SERVER_URL)
    //             .get(endpoint)
    //             .then(function (res: Response) {
    //                 expect(res.status).to.be.equal(200);
    //             })
    //             .catch(function (err) {
    //                 expect.fail();
    //             });
    //     } catch (err) {
    //         Log.trace(err, "!!!");
    //     }
    // });

});
