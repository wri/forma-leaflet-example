function init() {

	// get last valid date of forma
	getLastFormaDate(function(dateResp) {
		
		// with this information, pull the proper tiles
		loadMap(dateResp)
	})

}

function getLastFormaDate(callback) {
	var today = new Date();
	var currentYear = today.getFullYear().toString();
	
	// FORMA is not published every day
	// this API will tell you what dates we have FORMA tiles for
    var url = 'https://api-dot-forma-250.appspot.com/dates?year=' + currentYear

	// talk to the API to get the last valid date
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
        if (xhr.readyState == XMLHttpRequest.DONE) {
			var resp = JSON.parse(xhr.responseText)
			
			// extract last valid data from response
			var lastDate = resp[currentYear].slice(-1)[0].replace(/-/g, '');
            callback(lastDate);
        }
    }
    xhr.open('GET', url, true);
    xhr.send(null);
	
}

function loadMap(today) {
    // create canvas layer place holder
    var CanvasLayer = new Canvas({
        maxZoom: 9,
        urlTemplate: 'https://storage.googleapis.com/forma-public/Forma250/tiles/forma_' + today + '/v1/%z/%x/%y.png'
    });

    var forma = L.tileLayer.canvas({
        noWrap: true,
        attribution: 'WRI'
    });

    // create a UI slider for the end user to toggle the pixel range to display
    var slider = document.getElementById('slider');
    noUiSlider.create(slider, {
        start: [0, 6],

        //weekly timesteps
        step: 0.0027,
        connect: true,
        range: {
            min: 0,
            max: 6
        }

    });
	
	var minDateFmt;
	var maxDateFmt;

    // When the slider value changes, update the input and span
    slider.noUiSlider.on('set', function(values, handle) {

        // get the date values from the slider
        minDateFmt = formatDate(slider_to_date(values[0]))
        maxDateFmt = formatDate(slider_to_date(values[1]))

        // update the slider display
        document.getElementById('min').innerHTML = 'Start: ' + minDateFmt;
        document.getElementById('max').innerHTML = 'End: ' + maxDateFmt;

        // redraw the tiles without resetting
        redraw(forma)
    });

    // set bounding box for map + create it
    var southWest = L.latLng(-90, -179),
        northEast = L.latLng(90, 179),
        worldBounds = L.latLngBounds(southWest, northEast);

    var map = L.map('map', {
        noWrap: true,
        minZoom: 3,
        maxZoom: 16,
        maxBounds: worldBounds
    }).setView([0, 15], 3);

    // initialize the Leaflet hash plugin to add zoom/lat/lon hash to our url
    var hash = new L.Hash(map);

    // add the OSM basemap
    var osm = L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    });
    map.addLayer(osm);

    // global function to redraw the tiles
    // called when the time slider changes
    window.redraw = function() {

        for (t in forma._tiles) {
            forma._redrawTile(forma._tiles[t]);
        }
    }

    // define the draw tile function for the canvas layer
    // this plugs in to Leaflet's canvas layer, and (presumably)
    // overrides the default drawTile method
    forma.drawTile = function(canvas, tilePoint, zoom) {

        // grab the min and max date from the slider
        var minDate = parseInt(slider_to_date(slider.noUiSlider.get()[0]));
        var maxDate = parseInt(slider_to_date(slider.noUiSlider.get()[1]));

        // pass these and to the custom getTile method so we can filter forma
        CanvasLayer.getTile(tilePoint, zoom, canvas, minDate, maxDate);
    };

    forma.addTo(map);

    // create an empty feature group for our user-drawn AOIs + add to map
    var editableLayers = new L.FeatureGroup();
    map.addLayer(editableLayers);

    // leaflet draw plugin options
    var options = {
        position: 'topleft',
        draw: {
            polygon: {
                allowIntersection: false, // Restricts shapes to simple polygons
                drawError: {
                    color: '#e1e100',
                    message: '<strong>Oh snap!<strong> you can\'t draw that!'
                },
                shapeOptions: {
                    color: '#bada55'
                }
            },
            circle: false,
            rectangle: false,
            marker: false,
            polyline: false
        },
        edit: false
    };

    // create + add leaflet draw plugin to map
    var drawControl = new L.Control.Draw(options);
    map.addControl(drawControl);

    // fired when a user completes a new polygon
    map.on(L.Draw.Event.CREATED, function(e) {

        // clear old features
        editableLayers.clearLayers();

        // grab layer + add new popup
        var layer = e.layer;
        layer.bindPopup(buildPopupHTML());

        // build popup dynamically when clicked
        layer.on('click', function() {
            layer.bindPopup(buildPopupHTML());
        })

        // add layer to map
        editableLayers.addLayer(layer);

    });

    // function to count the FORMA alerts for a user-drawn polygon
    window.countFORMAInAOI = function() {
        console.log('calling GFW API')

        // grab the polygon as GeoJSON from the map
        var geojson = editableLayers.toGeoJSON()
		
		console.log('got our user-drawn AOI in GeoJSON format:')
        console.log(geojson)
		
		console.log('now saving it to the GFW API geostore with a POST request')

        // Send the geoJSON to the API geostore
        // We need a geostore ID so that we can tell
        // the FORMA API our area of interest
        getGeostore(geojson, function(resp) {

            // grab the geostoreID from the response
            geostoreID = resp.data.id;
			console.log('POST request successful, geostore ID is ' + geostoreID)
			console.log('you can view the geostore here: http://production-api.globalforestwatch.org/v1/geostore/' + geostoreID)

            // build our params for the FORMA API call
            params = {
                'geostore': geostoreID,
                'minDate': minDateFmt,
                'maxDate': maxDateFmt
            }

            // call the FORMA API to get a count of alerts based on
            // our AOI, min/max date
            formaAnalysis(params, function(formaResp) {
                var formaCount = formaResp.data.attributes.alertCounts
                console.log('There are ' + withCommas(formaCount) + ' alerts in this AOI')
                alert('There are ' + withCommas(formaCount) + ' alerts in this AOI')

            })
        })
    }

    // build the popup for the polygon
    var buildPopupHTML = function() {
		
		var values = slider.noUiSlider.get()
		minDateFmt = formatDate(slider_to_date(values[0]))
        maxDateFmt = formatDate(slider_to_date(values[1]))
		
        var html = 'FORMA Alerts by AOI<br><hr>'
        html += '<strong>Period</strong>: ' + minDateFmt + ' - ' + maxDateFmt + '<br>'
        html += '<button name="button" onclick="countFORMAInAOI()" >Run analysis</button>'

        return html
    }
}