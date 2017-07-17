
// send the GeoJSON of our polygon to the GFW Geostore
// we'll use the Geostore ID that's returned to pass
// our AOI directly to the FORMA API
function getGeostore(geojson, callback) {
    url = 'https://production-api.globalforestwatch.org/v1/geostore'

    var http = new XMLHttpRequest();
    var params = JSON.stringify({
        "geojson": geojson
    });
    http.open("POST", url, true);

    //Send the proper header information along with the request
    http.setRequestHeader("Content-type", "application/json");

    http.onreadystatechange = function() { //Call a function when the state changes.
        if (http.readyState == 4 && http.status == 200) {
            callback(JSON.parse(http.responseText));
        }
    }
    http.send(params);
}

// send geostore ID, min + max date, and confidence value to
// the FORMA API
function formaAnalysis(params, callback) {

    url = 'https://production-api.globalforestwatch.org/v1/forma250GFW';
    url += '?geostore=' + params.geostore

    min = new Date(params.minDate);
    max = new Date(params.maxDate);

    url += '&period=' + min.yyyymmdd() + ',' + max.yyyymmdd();
	
	console.log('now calling the FORMA API to get a count of alerts in our area of interest')
	console.log(url)

    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
        if (xhr.readyState == XMLHttpRequest.DONE) {
            callback(JSON.parse(xhr.responseText));
        }
    }
    xhr.open('GET', url, true);
    xhr.send(null);
}

// add a function to the JS Date object to convert it
// to YYYY-MM-DD format that's required by the FORMA API
Date.prototype.yyyymmdd = function() {
    var mm = this.getMonth() + 1; // getMonth() is zero-based
    var dd = this.getDate();

    return [this.getFullYear(),
        (mm > 9 ? '' : '0') + mm,
        (dd > 9 ? '' : '0') + dd
    ].join('-');
};