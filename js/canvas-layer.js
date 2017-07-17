/**
 If possible, I would avoid looking in here/editing any of the code
 It was written by Gerardo Pacheco, and is fairly complex with respect
 to scaling GLAD map tiles dynamically. 
 
 I've commented out the tile cache stuff-- was interfering with my poor
 implementation of dynamic tile filtering-- but otherwise this code is as
 he wrote it.
 
 Ideally this should be included in the project and then referenced only as it
 is in script.js-- using the getTile method to overwrite Leaflet's CanvasLayer drawTile
*/

  function Canvas(options) {
	this.dataMaxZoom = options.maxZoom || 9;
	this.tiles = {};
	this.urlTemplate = options.urlTemplate || '';
  }
  Canvas.prototype.getTile = function(coord, zoom, canvas, minDate, maxDate) {
	  
	  //console.log('getting tile with min: ' + minDate + ', max: ' + maxDate)
	  
	/**
	 * Enable cache of tiles
	 */
	//var tileId = this._getTileId(coord.x, coord.y, zoom);
	//var objKeys = Object.keys(this.tiles);
	//for (var i = 0; i < objKeys.length; i++) {
	//  if (this.tiles[objKeys[i]].z !== zoom) {
	//	delete this.tiles[objKeys[i]];
	//  }
	//}
	//if (this.tiles[tileId]) {
	//  return this.tiles[tileId].canvas;
	//}
	var url = this._getUrl.apply(this, this._getTileCoords(coord.x, coord.y, zoom));
	this._getImage(url, function(image) {
	  var canvasData = {
		  canvas: canvas,
		  image: image,
		  x: coord.x,
		  y: coord.y,
		  z: zoom
	  };
	  //this._cacheTile(canvasData);
	  this._drawCanvasImage(canvasData, minDate, maxDate);
	}.bind(this));
	return canvas;
  };
  Canvas.prototype._getImage = function(url, callback) {
	var xhr = new XMLHttpRequest();
	xhr.onload = function() {
	  var url = URL.createObjectURL(this.response);
	  var image = new Image();
	  image.onload = function() {
		image.crossOrigin = '';
		callback(image);
		URL.revokeObjectURL(url);
	  };
	  image.src = url;
	};
	xhr.open('GET', url, true);
	xhr.responseType = 'blob';
	xhr.send();
  };
  Canvas.prototype._getTileId = function(x, y, z) {
	  return x + '_' + y + '_' + z;
  };
  Canvas.prototype._getZoomSteps = function(z) {
	return z - this.dataMaxZoom;
  };
  Canvas.prototype.decodeData = function(rgba) {
	// find the total days of the pixel by
	// multiplying the red band by 255 and adding
	// the green band to that
	var total_days = rgba[1] * 255 + rgba[2];
	// take the total days value and divide by 365 to
	// get the year_offset. Add 15 to this (i.e 0 + 15 = 2015)
	// or 1 + 15 = 2016
	var year_int = parseInt(total_days / 365) + 11;
	// Multiply by 1000 to give us year in YYDDD format
	// (i.e. 15000 or 16000)
	var year = parseInt(year_int * 1000)
	// Find the remaining days to get the julian day for
	// that year
	var julian_day = total_days % 365;
	// Add to get YYDDD date val
	var date_val = year + julian_day;
	// Convert the blue band to string, leading
	// zeros if it's not currently three digits
	// this occurs very rarely; where there's an intensity
	// value but no date/confidence for it. Due to bilinear
	// resampling
	var band3_str = this.pad(rgba[0].toString());
	// Grab the raw intensity value from the pixel; ranges from 1 - 55
	var intensity_raw = parseInt(band3_str.slice(1, 3))
	// Scale the intensity to make it visible
	var intensity = intensity_raw * 50
	// Set intensity to 255 if it's > than that value
	if (intensity > 255) {
	  intensity = 255
	}
	return {
	  date_val: date_val,
	  year_int: year_int,
	  intensity: intensity
	}
  };
  Canvas.prototype.pad = function(num) {
	var s = '00' + num;
	return s.substr(s.length - 3);
  };
  Canvas.prototype.filterTileImgdata = function(data, minDate, maxDate) {
	  
	for (var i = 0; i < data.length; i += 4) {
	  pixelInfo = this.decodeData(data.slice(i, i + 4))
	  
	  // if the pixel passes the date filters, recolor it in some way
	  if (pixelInfo.date_val >= minDate && pixelInfo.date_val <= maxDate) {
		  
		  // this just turns all pixels pink
		  data[i] = 220;
		  data[i + 1] = 102;
		  data[i + 2] = 153;
		  data[i + 3] = pixelInfo.intensity;
		  
		  continue;
	  
	  // if it doesn't match the filter, set opacity to 0
	  }
		data[i + 3] = 0
	}
	return data;
  };
  Canvas.prototype._drawCanvasImage = function(canvasData, minDate, maxDate) {
	"use asm";
	var canvas = canvasData.canvas,
	  ctx    = canvas.getContext('2d'),
	  image  = canvasData.image,
	  zsteps = this._getZoomSteps(canvasData.z) | 0; // force 32bit int type
	ctx.clearRect(0, 0, 256, 256);                    // this will allow us to sum up the dots when the timeline is running
	if (zsteps < 0) {
	  ctx.drawImage(image, 0, 0);
	} else {                                          // over the maxzoom, we'll need to scale up each tile
	  ctx.imageSmoothingEnabled = false;              // disable pic enhancement
	  ctx.mozImageSmoothingEnabled = false;
	  // tile scaling
	  var srcX = (256 / Math.pow(2, zsteps) * (canvasData.x % Math.pow(2, zsteps))) |0,
		  srcY = (256 / Math.pow(2, zsteps) * (canvasData.y % Math.pow(2, zsteps))) |0,
		  srcW = (256 / Math.pow(2, zsteps)) |0,
		  srcH = (256 / Math.pow(2, zsteps)) |0;
	  ctx.drawImage(image, srcX, srcY, srcW, srcH, 0, 0, 256, 256);
	}
	var I = ctx.getImageData(0, 0, canvas.width, canvas.height);
	//this.filterTileImgdata(I.data, canvas.width, canvas.height, canvasData.z, minDate, maxDate);
	this.filterTileImgdata(I.data, minDate, maxDate);
	ctx.putImageData(I, 0, 0);
  };
  Canvas.prototype._getUrl = function(x, y, z) {
	return this.urlTemplate.replace('%z', z).replace('%x', x).replace('%y', y);
  };
  Canvas.prototype._getTileCoords = function(x, y, z) {
	if (z > this.dataMaxZoom) {
	  x = Math.floor(x / (Math.pow(2, z - this.dataMaxZoom)));
	  y = Math.floor(y / (Math.pow(2, z - this.dataMaxZoom)));
	  z = this.dataMaxZoom;
	} else {
	  y = (y > Math.pow(2, z) ? y % Math.pow(2, z) : y);
	  if (x >= Math.pow(2, z)) {
		x = x % Math.pow(2, z);
	  } else if (x < 0) {
		x = Math.pow(2, z) - Math.abs(x);
	  }
	}
	return [x, y, z];
  };
  Canvas.prototype._cacheTile = function(canvasData) {
	var tileId = this._getTileId(canvasData.x, canvasData.y, canvasData.z);
	canvasData.canvas.setAttribute('id', tileId);
	this.tiles[tileId] = canvasData;
  };