function GoogleImporter(){	

	var that = this;
	
	const GOOGLE_KEY = "AIzaSyC-hkv1dS7t-jXthfGmCOIjwyvPnUCLvDE"; //Should go into the environment variables for secrecy
	that.SEARCH_RADIUS = 5000; // meters; what's a good value? Max 200 venues are returned per search request
	//that.SEARCH_RADIUS = 500; //for testing
	
	const request = require('request');
	
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
					//console.log(details.result);
					callback(details.result);
				} else {
					console.log(details.status);
				}
			} else {
				console.log("Status Code: " + res.statusCode);
			}
			
		});
	};
	
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
				request(searchVenues(lat, lng, 'cafe'), processVenues(function(cafes){
					request(searchVenues(lat, lng, 'night_club'), processVenues(function(clubs){
						
						locations = locations.concat(restaurants, bars, cafes, clubs);
						
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
	};
}

module.exports = new GoogleImporter();