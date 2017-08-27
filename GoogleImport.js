function GoogleImporter(){	

	var that = this;
	
	const GOOGLE_KEY = "AIzaSyC-hkv1dS7t-jXthfGmCOIjwyvPnUCLvDE";
	that.SEARCH_RADIUS = 2000; // meters
	
	const request = require('request');
	var photoModule = require('./photoModule');
	
	/**
	* Converts a given location name to lat/long coordinates and executes the callback function on them
	*/
	that.convertToLatLng = function(str, callback){
		
		var options = {
			method: 'GET',
			uri: "https://maps.googleapis.com/maps/api/geocode/json",
			qs: {
				key: GOOGLE_KEY,
				address: str
			}
		};
		
		console.log("Convert " + str + " to lat. and lng.");
		request(options, function(err, res, body){
			if(!err && res.statusCode == 200){
				var loc = JSON.parse(body);
				if(loc.status == "OK"){
					console.log("Coordinates of " + str + " are: " + loc.results[0].geometry.location.lat + "," + loc.results[0].geometry.location.lng);
					callback(loc.results[0].geometry.location); // object with lat:..., lng:...
				} else {
					console.log(loc.status);
					callback(null);
				}
			} else {
				console.log("Status Code: " + res.statusCode);
				callback(null);
			}
		});
	}
	
	/**
	* Imports a photo (defined by its reference) for a venue (defined by its id) and executes the callback function with status "OK" if successful
	*/
	that.getVenuePhoto = function(id, ref, callback){
		var options = {
			method: 'GET',
			uri: "https://maps.googleapis.com/maps/api/place/photo",
			qs: {
				key: GOOGLE_KEY,
				photoreference: ref,
				maxwidth: 400
			}
		};
		
		var optionsHead = {
			method: 'HEAD',
			uri: "https://maps.googleapis.com/maps/api/place/photo",
			qs: {
				key: GOOGLE_KEY,
				photoreference: ref,
				maxwidth: 400
			}
		};
		
		console.log("Getting photo for venue: " + id);
		
		request(optionsHead, function(err, res, body){
			if(!err && res.statusCode == 200){
				if(res.headers["content-type"] == "image/jpeg" || res.headers["content-type"] == "image/png"){
					photoModule.addPhotoPathId(res.headers["content-type"] == "image/jpeg" ? ".jpg" : ".png", function (photo){
						request(options).pipe(photoModule.fs.createWriteStream(photo.path)).on('close', function(){
							photoModule.addPhotoToVenue(id, photo.id, null, function(str){
								if(str)
									callback("OK");
								else
									callback(null);
							});
						});
					});
				} else {
					console.log("File type not supported: " + res.headers["content-type"]);
					callback(null);
				}
			} else {
				console.log("Status Code: " + res.statusCode);
				callback(null)
			}
		});
	};
	
	/**
	* Imports the details of a venue defined by its Google id and executes the callback on them
	*/
	that.getVenueDetails = function(id, callback){
		
		var options = {
			method: 'GET',
			uri: "https://maps.googleapis.com/maps/api/place/details/json",
			qs:{
				key: GOOGLE_KEY,
				placeid: id	
			}
		};
		
		console.log("Getting details vor venue: " + id);
		request(options, function(err, res, body){
			if(!err && res.statusCode == 200){
				var details = JSON.parse(body);
				if(details.status == "OK"){
					callback(details.result);
				} else {
					console.log(details.status);
					callback(null);
				}
			} else {
				console.log("Status Code: " + res.statusCode);
				callback(null);
			}
			
		});
	};
	
	/**
	* Searches for and imports unique Google venue ids in a radius around a location (lat, lng) and executes the callback function on them
	*/
	that.getVenues = function(lat, lng, callback){
		
		// typestr: 'restaurant' or 'bar' or ... (see Google Places -> Types)
		function searchVenues(lat, lng, typestr){
		
			var options = {
				method: 'GET',
				uri: 'https://maps.googleapis.com/maps/api/place/radarsearch/json',
				qs: {
					key: GOOGLE_KEY,
					location: "" + lat + "," + lng,
					radius: that.SEARCH_RADIUS,
					type: typestr
				}
			};
			return options;
		}
	
		function processVenues(callback){ 
			return function(err, res, body){
				var ids = [];
				if(!err && res.statusCode == 200){
					var venues = JSON.parse(body);
					if(venues.status == "OK"){
						for (var i = 0; i < venues.results.length; i++) {
							ids.push(venues.results[i].place_id);
							console.log(ids[i]);
						}
						callback(ids);
					} else {
						console.log(venues.status);
						callback(ids);
					}
				} else {
					console.log("Status Code: " + res.statusCode);
					callback(ids);
				}
			};
		}
		
		var locations = []
		
		request(searchVenues(lat, lng, 'restaurant'), processVenues(function(restaurants){
			request(searchVenues(lat, lng, 'bar'), processVenues(function(bars){
				request(searchVenues(lat, lng, 'bakery'), processVenues(function(bakeries){
					request(searchVenues(lat, lng, 'cafe'), processVenues(function(cafes){
						request(searchVenues(lat, lng, 'night_club'), processVenues(function(clubs){
							
							locations = locations.concat(restaurants, bars, bakeries, cafes, clubs);
							
							// remove duplicates
							console.log("Removing duplicate results");
							var noDups = {};
							for(var i=0; i<locations.length; i++){
								noDups[locations[i]] = locations[i];
							}
							locations = [];
							for(var key in noDups)
								locations.push(noDups[key]);
							
							callback(locations);						
						
						}));
					}));
				}));
			}));
		}));
	};
}

module.exports = new GoogleImporter();