/**
 * Receives a query object as parameter and sends it as Ajax request to the POST /query REST endpoint.
 *
 * @param query The query object
 * @returns {Promise} Promise that must be fulfilled if the Ajax request is successful and be rejected otherwise.
 */
CampusExplorer.sendQuery = (query) => {
    return new Promise((resolve, reject) => {
        // source: https://stackoverflow.com/questions/1973140/parsing-json-from-xmlhttprequest-responsejson
        //         https://stackoverflow.com/questions/9713058/send-post-data-using-xmlhttprequest
        let req = new XMLHttpRequest();

        req.open('POST', "http://localhost:4321/query");
        req.setRequestHeader('Content-type', 'application/json');

        req.onload  = function() {
            let jsonResponse = JSON.parse(req.responseText);
            if (jsonResponse.hasOwnProperty("error")) {
                reject(jsonResponse);
            } else {
                resolve(jsonResponse);
            }
        };
        req.send(JSON.stringify(query));

    });
};
