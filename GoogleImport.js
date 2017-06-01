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
		
		// typestr: restaurant or bar or ... (see Google)
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
				// TODO: How to include more types? We don't want restaurants exclusively, but also cafés, bars etc.
				// Maybe do more searches in the callbacks!
			};
			return options;
		}
		
		request(searchVenues(lat, lng, 'restaurant'), function(err, res, body){
			var ids = [];
			if(!err && res.statusCode == 200){
				var locations = JSON.parse(body);
				if(locations.status == "OK"){
					for (var i = 0; i < locations.results.length; i++) {
						ids[i] = locations.results[i].place_id;
						console.log(ids[i]);
					}
					callback(ids);
				} else {
					console.log(locations.status);
				}
			} else {
				console.log("Status Code: " + res.statusCode);
			}
		});
	};
}

module.exports = new GoogleImporter();