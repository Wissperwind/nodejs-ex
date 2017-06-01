// There could be a problem in the queries when at the border of longitude where lng 180 swaps to lng -180

function dbConnection() {
	
	const mysql = require('mysql');
	var GoogleImport = require('./GoogleImport')
	
	//const USER_SEARCH_RADIUS = 1000;
	const USER_SEARCH_RADIUS = 400; //for testing
	// meters; for the mobile application, so all venues in our db in the USER_SEARCH_RADIUS around request.lat,lng are displayed
	// how large should our radius be?
	
	that = this;
	
	// var connection = mysql.createConnection({
			// 'host' 		: 'sql11.freemysqlhosting.net',
			// 'user'		: 'sql11175021',
			// 'password'	: 'fXIz3dRIpx',
			// 'database'	: 'sql11175021'		
		// });	
	
	var connection = mysql.createConnection({
			'host' 		: 'localhost',
			'user'		: 'root',
			'password'	: '',
			'database'	: 'iptk'		
		});	
	
	that.connect = function(){
		connection.connect( function(err) {
			if(err)
				console.log('Error connecting to db: '+err);
			else
				console.log('Connected to db')
		});
	};
	
	function getDistanceInMeters(lat1, lon1, lat2, lon2){
		var radius = 6378137; // (equatorial) earth radius in meters
		var dLat = lat2 * Math.PI / 180 - lat1 * Math.PI / 180;
		var dLon = lon2 * Math.PI / 180 - lon1 * Math.PI / 180;
		var a =
			Math.sin(dLat/2) * Math.sin(dLat/2) +
			Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
			Math.sin(dLon/2) * Math.sin(dLon/2);
		var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
		var dist = radius * c;
		// console.log("Distance between " + lat1 + "," + lon1 + " and " + lat2 + "," + lon2 + " is " + dist);
		return dist;
	}
	
	that.getLatLon = function(lat1, lon1, dist, brng){
		var R = 6378137;
		lat1 = lat1 * (Math.PI / 180);
		lon1 = lon1 * (Math.PI / 180);
		brng = brng * (Math.PI / 180);
		var lat2 = Math.asin( Math.sin(lat1)*Math.cos(dist/R) + Math.cos(lat1)*Math.sin(dist/R)*Math.cos(brng) );
		var lon2 = lon1 + Math.atan2( Math.sin(brng)*Math.sin(dist/R)*Math.cos(lat1), Math.cos(dist/R)-Math.sin(lat1)*Math.sin(lat2) );
		lon2 = (lon2+540)%360-180;
		var pos = [lat2 * 180/Math.PI, lon2 * 180/Math.PI];
		return pos;
	};
	
	that.isResponseEmpty = function(resArray){
		return !((typeof resArray != "undefined") && (resArray != null) && (resArray.length > 0));
	}
	
	that.addSearch = function(lat, lng, callback) {
		query = "INSERT INTO scanned_locations SET lat=?, lng=?, radius=?";
		connection.query(
		query,
		[
			lat,
			lng,
			GoogleImport.SEARCH_RADIUS
		],
		function(err, result){
			if(!err) {
				console.log("Inserted search location into db: lat: " + lat + ", lng: " + lng);
				callback(null);
			} else {
				console.log("Error trying to insert search location into database");
				console.log(err);
				callback(null);
			}
		});
	};
	
	that.addCity = function(name, callback){
		connection.query("INSERT INTO cities SET name=?", [name], function(err, result){
			if(!err) {
				console.log("Inserted city " + name + " into db with id: " + result.insertId);
				var city = {};
				city.id = result.insertId;
				city.name = name;
				callback(city);
			} else {
				console.log("Error trying to insert city into database");
				console.log(err);
				callback(null);
			}
		});
	};
	
	that.getCityID = function(name, callback){
		console.log("Getting ID for city: "+name);
		connection.query("SELECT * FROM cities WHERE name=?", [name], function(err, rows, fields){
			if(!err){
				for(var i=0; i<rows.length; i++){
					console.log("Found city " + name + " with ID: " + rows[i].id);
					callback(rows[i].id);
				}
				if(i == 0){
					console.log("Adding city to db...");
					that.addCity(name, function(city){
						callback(city.id);
					});
				}
			} else {
				console.log("Could not get city ID");
				console.log(err);
			}
		});
	};
	
	that.createVenue = function(venue, callback) {
		
		console.log("Create venue in city: "+venue.vicinity.split(", ")[1]);
		that.getCityID(venue.vicinity.split(", ")[1], function(cityID){
			var weekdayStr = "";
			if(("opening_hours" in venue) && ("weekday_text" in venue.opening_hours)){
				for (var i = 0; i<venue.opening_hours.weekday_text.length; i++){
					weekdayStr = weekdayStr + venue.opening_hours.weekday_text[i] + ",";
				}
			}
		
			query = "INSERT INTO venues SET id=?, lat=?, lng=?, name=?, city=?, address=?, phone=?, website=?, weekday_text=?, price_level=?, icon=?";
			connection.query( query,
			[
				venue.place_id,
				venue.geometry.location.lat,
				venue.geometry.location.lng,
				venue.name,
				cityID,
				venue.vicinity,
				venue.international_phone_number,
				venue.website,
				weekdayStr,
				venue.price_level,
				venue.icon
			],
			function(err, result){
				if(!err) {
					console.log("Inserted venue into db: " + venue.place_id);
					callback(venue);
				} else {
					console.log("Error trying to insert venue into database");
					console.log(err);
					callback(null);
				}
			});
		});
	};
	
	// low detail response for list and display on map
	that.getVenuesFromDB = function(lat, lng, dist, callback){
		// TODO: query seems to be a square, maybe change to circle
		connection.query("SELECT * FROM venues WHERE lat>=? AND lat<=? AND lng>=? AND lng<=?",
		[that.getLatLon(lat, lng, dist, 180)[0], that.getLatLon(lat, lng, dist, 0)[0], that.getLatLon(lat, lng, dist, 270)[1], that.getLatLon(lat, lng, dist, 90)[1]],
		function(err, rows, field){
			if(!err){
				var venues = [];
				var venue;
				for(var i=0; i<rows.length; i++){
					console.log("Venue ID: " + rows[i].id);
					venue = {};
					// What should go into our response?
					venue.id = rows[i].id;
					venue.lat = rows[i].lat;
					venue.lng = rows[i].lng;
					venue.name = rows[i].name;
					venue.address = rows[i].address;
					
					venues.push(venue);
				}
				console.log(venues);
				callback(venues);
			} else {
				console.log("Error querying db for venues");
			}
		});
	};
	
	// high detail response for venue window
	that.findVenue = function(id, callback){
		connection.query("SELECT * FROM venues WHERE id=?", [id], function(err, rows, fields){
			if(!err){
				
			} else {
				console.log("Error querying db for venues")
			}
		});
	};
	
	that.importVenuesFromGoogle = function(lat, lng, callback){
		
		function importAndUpload(ids, venues, counter, callback){
			var idInDB = false;
			if(counter < ids.length){
				// check if place_id is already in db
				if(!that.isResponseEmpty(venues)){
					for(var j=0; j<venues.length; j++){
						if(ids[counter] == venues[j].id){
							idInDB = true;
							break;
						}
					}
				}
				
				// if it is not, fetch and add the details belonging to place_id to our database
				if(!idInDB){
					console.log("Found a venue that is not in db; ID: " + ids[counter]);
					console.log("Retrieving details for venue with ID: " + ids[counter]);
					
					GoogleImport.getVenueDetails(ids[counter], function(details){
						that.createVenue(details, function(venue){
							importAndUpload(ids, venues, counter+1, callback);
						});
					});
				}
			} else {
				// callback should be getVenuesFromDB with USER_SEARCH_RADIUS
				// after the new venues have been added to our db (counter == ids.length)
				console.log("Executing callback for last venue");
				callback();
			}
		}
		
		// get venues/place_ids in a circle around lat, lng
		console.log("Scanning Google Places for venues...");
		GoogleImport.getVenues(lat, lng, function(ids){
			
			console.log("Received venues. Add search to db...");
			that.addSearch(lat, lng, function(foo){
			
				console.log("Added search to db. Comparing Google's venues to venues in db...");
				
				that.getVenuesFromDB(lat, lng, GoogleImport.SEARCH_RADIUS, function(venues){
					var i = 0;
					importAndUpload(ids, venues, i, callback);
				});
			});
		});
		
		// if not, request venue details and insert them into db
		// GoogleImport.getVenues(lat, lng, function(result){
			// query = "";
			// connection.query
		// });
	};
	
	that.checkSearches = function(lat, lng, circles){
		
		// In case we are not fully inside one of our previous searches
		// or no previous searches were found, we need to scan Google Places
		var needScan = true;
		
		if(!that.isResponseEmpty(circles)){
			var dist;
			
			// If previous searches were found, check them
			for(i=0; i<circles.length; i++){
				var circle = circles[i];
				dist = circle.radius - USER_SEARCH_RADIUS;
				// As soon as we are fully inside one of our previous searches, we do not need to scan Google Places
				// and can use what's inside our db
				if(getDistanceInMeters(lat, lng, circle.lat, circle.lng) <= dist){
					needScan = false;
					break;
				}
			}
		}
		return needScan;
	};
	
	that.searchForVenues = function(lat, lng, callback){
		// check if we have already scanned here
		var d = GoogleImport.SEARCH_RADIUS;
		
		connection.query(
			"SELECT * FROM scanned_locations WHERE lat>=? AND lat<=? AND lng>=? AND lng<=?",
			[that.getLatLon(lat, lng, d, 180)[0], that.getLatLon(lat, lng, d, 0)[0], that.getLatLon(lat, lng, d, 270)[1], that.getLatLon(lat, lng, d, 90)[1]],
			function(err, locations, fields){
				if(!err){
					var needScan = that.checkSearches(lat, lng, locations);
					if(needScan){
						that.importVenuesFromGoogle(lat, lng, function(){that.getVenuesFromDB(lat, lng, USER_SEARCH_RADIUS, callback);});
					} else {
						that.getVenuesFromDB(lat, lng, USER_SEARCH_RADIUS, callback);
					}
				} else {
					console.log("Error querying db for previous searches");
					console.log(err);
				}
			}
		);
	};
	
	that.getVenues = function(req, res, next){
		var tmp = req.params.latlng.split(",");
		var lat = tmp[0];
		var lng = tmp[1];
		
		console.log("Request for venues around lat: " + lat + ", lng: " + lng);
		
		that.searchForVenues(lat, lng, function(venues){
			res.send(200, venues);
		});
		return next();
	};
	
	that.getVenue = function(req, res, next){
		var tmp = req.params.id;
		
		console.log("Request for venue with id: " + tmp);
		
		that.findVenue(id, function(venue){
			res.send(200, venue);
		});
		return next();
	};
	
	// that.postVenue = function(req, res, next){
		// if(!req.body.hasOwnProperty('place_id')){
			// res.send(500, "Insufficient parameters, place_id required");
		// } else {
			// var venue = {
				// id: req.body.place_id
			// };
			
			// that.createVenue(venue, function(venue){
				// console.log("Venue added: id: "+venue.id);
				// res.send(201, venue);
			// });
		// }
		// return next();
	// };
	
/* 	that.testScanned = function(lat, lng){
		var d = GoogleImport.SEARCH_RADIUS;
		
		connection.query(
			"SELECT * FROM scanned_locations WHERE lat>=? AND lat<=? AND lng>=? AND lng<=?",
			[that.getLatLon(lat, lng, d, 180)[0], that.getLatLon(lat, lng, d, 0)[0], that.getLatLon(lat, lng, d, 270)[1], that.getLatLon(lat, lng, d, 90)[1]],
			function(err, locations, fields){
				console.log(locations);
				console.log(that.checkSearches(49.83262612357941, 9.150138613404195, locations));
			}
		);
	}; */
}

module.exports = new dbConnection();