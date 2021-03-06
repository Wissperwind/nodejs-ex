function venueModule() {
	
	var that = this;

	var database = require('./database');
	var cityModule = require('./cityModule');
	var commentModule = require('./commentModule');
	var checkinModule = require('./checkinModule');
	var photoModule = require('./photoModule');
	var GoogleImport = require('./GoogleImport');
	
	/**
	* Calculates the distance between two lat-long coordinate pairs
	*/
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
	
	/**
	* Calculates the lat-long coordinate pair when heading 'dist' meters into the direction 'brng' from the location 'lat1','lon1'
	*/
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
	
	/**
	* checks if an array is "empty"
	*/
	that.isResponseEmpty = function(resArray){
		return !((typeof resArray != "undefined") && (resArray != null) && (resArray.length > 0));
	}
	
	/**
	* Inserts a search location and radius into the database and executes the callback function on the new inserted id
	*/
	that.addSearch = function(lat, lng, callback) {
		query = "INSERT INTO scanned_locations SET lat=?, lng=?, radius=?";
		database.connection.query(
		query,
		[
			lat,
			lng,
			GoogleImport.SEARCH_RADIUS
		],
		function(err, result){
			if(!err) {
				console.log("Inserted search location into DB: lat: " + lat + ", lng: " + lng);
				callback(result.insertId);
			} else {
				console.log("Error trying to insert search location into database");
				console.log(err);
				callback(null);
			}
		});
	};
	
	/**
	* Marks a search location as complete and executes the callback function on its id
	*/
	that.updateSearchComplete = function(id, callback) {
		query = "UPDATE scanned_locations SET isComplete=1 WHERE id=?";
		database.connection.query(
		query,[id],function(err, result){
			if(!err) {
				console.log("Updated search location with id: "+id);
				callback(id);
			} else {
				console.log("Error trying to update search location with id: "+id);
				console.log(err);
				callback(null);
			}
		});
	};
	
	/**
	* Inserts a venue, its details, its types and its photos into the database and executes the callback function on the venue
	*/
	that.createVenue = function(venue, callback) {
		
		function addVenueTypes(id, types, counter, callback){
			if(counter<types.length){
				
				var vtype = "";
				switch(types[counter]){
					case "bakery": vtype = "Bakery"; break;
					case "bar": vtype = "Bar"; break;
					case "cafe": vtype = "Cafe"; break;
					//case "liquor_store": vtype = "Spirits"; break;
					case "meal_delivery": vtype = "Delivery"; break;
					case "meal_takeaway": vtype = "Takeaway"; break;
					case "night_club": vtype = "Club"; break;
					case "restaurant": vtype = "Restaurant"; break;
					default: addVenueTypes(id, types, counter+1, callback); return;
				}
				
				database.connection.query("INSERT INTO venuekind SET venue_id=?, type=?", [id, vtype], function(err, result){
					if(!err) {
						console.log("Added type " + vtype + " to venue " + id +" into DB");
						addVenueTypes(id, types, counter+1, callback);
					} else {
						console.log("Error trying to add type for venue " + id);
						console.log(err);
						addVenueTypes(id, types, counter+1, callback);
					}
				});
			} else {
				callback();
			}
		}
		
		function addVenuePhotos(id, refs, counter, callback){
			if(counter<refs.length){
				GoogleImport.getVenuePhoto(id, refs[counter], function(ok){
					if(ok){
						console.log("Added photo to venue " + id);
						addVenuePhotos(id, refs, counter+1, callback);
					} else {
						console.log("Did not add photo to venue " + id);
						addVenuePhotos(id, refs, counter+1, callback);
					}
				});
			} else {
				callback();
			}
		}
		
		if(venue != null){
			var cityName = "Somewhere";
			for(var i=0; i<venue.address_components.length;i++){
				if(venue.address_components[i].types.indexOf("locality") > -1){
					cityName = venue.address_components[i].long_name;
					break;
				}
			}
			console.log("Create venue in city: "+cityName);
			cityModule.getCityID(cityName, function(cityID){
				var weekdayStr = "Missing opening hours";
				if(("opening_hours" in venue) && ("weekday_text" in venue.opening_hours)){
					weekdayStr = "";
					for (var i = 0; i<venue.opening_hours.weekday_text.length; i++){
						weekdayStr = weekdayStr + venue.opening_hours.weekday_text[i] + "\n"; //",";
					}
				}
				
				var photoRefs = [];
				if("photos" in venue){
					for(var i = 0; i<venue.photos.length && i < 3; i++){
						photoRefs.push(venue.photos[i].photo_reference);
					}
				}
			
				query = "INSERT INTO venues SET google_id=?, lat=?, lng=?, name=?, city=?, address=?, phone=?, website=?, weekday_text=?, price_level=?, icon=?";
				database.connection.query( query,
				[
					venue.place_id,
					venue.geometry.location.lat,
					venue.geometry.location.lng,
					venue.name,
					cityID,
					venue.vicinity,
					venue.international_phone_number ? venue.international_phone_number : "Missing phone number",
					venue.website ? venue.website : "Missing website",
					weekdayStr,
					venue.price_level ? venue.price_level : "Missing price level",
					venue.icon
				],
				function(err, result){
					if(!err) {
						console.log("Inserted venue into DB: " + result.insertId);
						addVenueTypes(result.insertId, venue.types, 0, function(){
							addVenuePhotos(result.insertId, photoRefs, 0, function(){
								callback(venue);
							});
						});
					} else {
						console.log("Error trying to insert venue into database");
						console.log(err);
						callback(null);
					}
				});
			});
		} else
			callback(null);
	};
	
	// low detail response for list and display on map
	/**
	* Either retrieves a list of venues matching the value of the "keyword" key in 'options' with a small amount of details in a square with length 'dist' around 'lat','lng' and executes the callback function on it
	* Or, if 'options' contains the "allByID" key with value true, only the venues' Google ids will be returned
	*/
	that.getVenuesFromDB = function(lat, lng, dist, options, callback){
		
		var qstr = "SELECT * FROM venues WHERE lat>=? AND lat<=? AND lng>=? AND lng<=?";
		var qarr = [that.getLatLon(lat, lng, dist, 180)[0], that.getLatLon(lat, lng, dist, 0)[0], that.getLatLon(lat, lng, dist, 270)[1], that.getLatLon(lat, lng, dist, 90)[1]];
		
		console.log("Getting venues between " +that.getLatLon(lat, lng, dist, 180)[0]+","+that.getLatLon(lat, lng, dist, 270)[1]+" and "+that.getLatLon(lat, lng, dist, 0)[0]+","+that.getLatLon(lat, lng, dist, 90)[1]);
		
		if("keyword" in options){
			qstr = "SELECT venues.*,photo.id AS photoId,categories FROM venues LEFT JOIN venue_has_picture ON (venues.id = venue_has_picture.venueID) LEFT JOIN photo ON (venue_has_picture.photoID = photo.id) RIGHT JOIN (venuekind RIGHT JOIN (SELECT venuekind.venue_id,GROUP_CONCAT(venuekind.type SEPARATOR ', ') AS categories FROM venuekind GROUP BY venuekind.venue_id) AS tmp USING (venue_id)) ON (venue_id = venues.id) WHERE lat>=? AND lat<=? AND lng>=? AND lng<=? AND (name LIKE ? OR type LIKE ?) GROUP BY venues.id";
			qarr.push("%" + options.keyword + "%"); qarr.push(options.keyword);
		} /* else if("category" in options){
			qstr = "SELECT venues.*,venuekind.type FROM venues RIGHT JOIN venuekind ON (venues.id = venuekind.venue_id) WHERE lat>=? AND lat<=? AND lng>=? AND lng<=? AND type LIKE ? GROUP BY id";
			qarr.push(options.category);
		} */
		
		database.connection.query(qstr, qarr, function(err, rows, field){
			if(!err){
				var venues = [];
				var venue;
				for(var i=0; i<rows.length; i++){
					venue = {};
					if("allById" in options)
						venue.google_id = rows[i].google_id;
					else {
						venue.id = rows[i].id;
						venue.lat = rows[i].lat;
						venue.lng = rows[i].lng;
						venue.name = rows[i].name;
						venue.address = rows[i].address;
						venue.categories = rows[i].categories;
						venue.rating = rows[i].rating;
						venue.iconURL = rows[i].icon;
						venue.imageURL = rows[i].photoId ? photoModule.serverAddress + "/photos/" + rows[i].photoId : rows[i].icon;
					}
					
					venues.push(venue);
				}
				console.log(venues);
				callback(venues);
				return;
			} else {
				console.log("Error querying DB for venues");
			}
			callback(null);
		});
	};
	
	// high detail response for venue window
	/**
	* Retrieves all details, including photo URLs, comments and checkins that belong to the venue defined by id and executes the callback function on the result
	*/
	that.findVenue = function(id, callback){
		commentModule.findCommentsByVenue(id, function(comments){
			checkinModule.findCheckinsByVenue(id, function(checkins){
				photoModule.findPhotosOfVenue(id, function(photos){
					database.connection.query("SELECT *,categories FROM venues LEFT JOIN (SELECT venuekind.venue_id,GROUP_CONCAT(venuekind.type SEPARATOR ', ') AS categories FROM venuekind GROUP BY venuekind.venue_id) AS tmp ON (venues.id = tmp.venue_id) WHERE venues.id=?", [id], function(err, rows, fields){
						if(!err){
							for(var i=0; i<rows.length; i++){
								console.log("Found venue: " + rows[i].name);
								var venue = {
									id:	rows[i].id,
									name: rows[i].name,
									lat: rows[i].lat,
									lng: rows[i].lng,
									rating: rows[i].rating,
									ratings: checkins.length,
									categories: ""+rows[i].categories,
									images: photos,
									comments: comments,
									topvisitors: checkins.slice(0, 6),
									address: rows[i].address,
									phone: rows[i].phone == "Missing phone number" ? "-" : rows[i].phone,
									website: rows[i].website == "Missing website" ? "-" : rows[i].website,
									open: rows[i].weekday_text == "Missing opening hours" ? "-" : rows[i].weekday_text,
									pricelevel: rows[i].price_level == "Missing price level" ? "-" : "Price level "+rows[i].price_level+" of 4"
								};
								callback(venue);
								return;
							}
						} else {
							console.log("Error querying DB for venue");
							console.log(err);
						}
						callback(null);
					});
				});
			});
		});
	};
	
	/**
	* Imports venues around 'lat','lng' that are not already in the database from Google and inserts them into the database
	*/
	that.importVenuesFromGoogle = function(lat, lng){
		
		function importAndUpload(ids, venues, counter, searchId){
			var idInDB = false;
			if(counter < ids.length){
				// check if place_id is already in DB
				if(!that.isResponseEmpty(venues)){
					for(var j=0; j<venues.length; j++){
						if(ids[counter] == venues[j].google_id){
							console.log("ID " + ids[counter] + " is in DB");
							venues.splice(j, 1); //remove venue to fasten up comparison
							idInDB = true;
							break;
						}
					}
				}
				
				// if it is not, fetch and add the details belonging to place_id to our database
				if(!idInDB){
					console.log("Found a venue that is not in DB; ID: " + ids[counter]);
					
					GoogleImport.getVenueDetails(ids[counter], function(details){
						that.createVenue(details, function(venue){
							importAndUpload(ids, venues, counter+1, searchId);
						});
					});
				} else {
					importAndUpload(ids, venues, counter+1, searchId);
				}
			} else {
				console.log("Search " + searchId + " is complete");
				that.updateSearchComplete(searchId, function(id){});
			}
		}
		
		// get venues/place_ids in a circle around lat, lng
		console.log("Scanning Google Places for venues...");
		GoogleImport.getVenues(lat, lng, function(ids){
			
			console.log("Received venues. Add search to DB...");
			that.addSearch(lat, lng, function(searchId){
			
				console.log("Added search to DB. Comparing Google's venues to venues in DB...");
				
				that.getVenuesFromDB(lat, lng, GoogleImport.SEARCH_RADIUS, {allById: true}, function(venues){
					var i = 0;
					importAndUpload(ids, venues, i, searchId);
				});
			});
		});
	};
	
	/**
	* Checks if a search circle defined by its center 'lat','lng' and 'radius' lies at least within one of the previous search 'circles'
	* returns true if it does, else false
	*/
	that.checkSearches = function(lat, lng, radius, circles){
		
		// In case we are not fully inside one of our previous searches
		// or no previous searches were found, we need to scan Google Places
		var needScan = true;
		
		if(!that.isResponseEmpty(circles)){
			var dist;
			var tmp = 0;
			if(radius >= 1950)	// to make sure no new searches are started when position changes only little due to GPS inaccuracy
				tmp = 50;
			
			// If previous searches were found, check them
			for(i=0; i<circles.length; i++){
				var circle = circles[i];
				dist = circle.radius - radius + tmp;
				// As soon as we are fully inside one of our previous searches, we do not need to scan Google Places
				// and can use what's inside our DB
				if(getDistanceInMeters(lat, lng, circle.lat, circle.lng) <= dist){
					needScan = false;
					break;
				}
			}
		}
		return needScan;
	};
	
	/**
	* Either starts importing venues from Google if the search circle with 'radius' around 'lat','lng' lies not within a previous search circle and executes the callback function with the status "searching"
	* Or retrieves the venues from the database if a suitable completed search has been found
	*/
	that.searchForVenues = function(lat, lng, radius, options, callback){
		// check if we have already scanned here
		var d = radius;
		
		database.connection.query(
			"SELECT * FROM scanned_locations WHERE lat>=? AND lat<=? AND lng>=? AND lng<=?",
			[that.getLatLon(lat, lng, d, 180)[0], that.getLatLon(lat, lng, d, 0)[0], that.getLatLon(lat, lng, d, 270)[1], that.getLatLon(lat, lng, d, 90)[1]],
			function(err, locations, fields){
				if(!err){
					var needScan = that.checkSearches(lat, lng, radius, locations);
					if(needScan){
						that.importVenuesFromGoogle(lat, lng);
						callback("searching"); // if no search was found, user should be told and venues scanned from Google
					} else {
						var completeSearch = false;
						for(var i=0; i<locations.length;i++){
							if(locations[i].isComplete != 0){
								completeSearch = true;
								break;
							}
						}
						if(completeSearch)
							that.getVenuesFromDB(lat, lng, d, options, callback); // if a complete search was found, retrieve venues
						else
							callback("searching");// if no complete search was found, user should be told to wait
					}
				} else {
					console.log("Error querying DB for previous searches");
					console.log(err);
					callback(null);
				}
			}
		);
	};
	
	/**
	* Handles GET venues requests
	* Either sends a list of venues around the requested location or status information (in case venues are being imported) to the mobile app
	* req.params must contain 'keyword', 'radius' and either 'city' or both 'lat' and 'lng'
	*/
	that.getVenues = function(req, res, next){
		
		function doSearch(lat, lng, radius){
		
			if(!(lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180)){
				res.send(400, {error: "We could not interpret your search location", venues: []});
				return next();
			}
			
			// a search keyword or category should be given, else return 400
			var options;
			if("keyword" in req.params){
				options = {keyword: req.params.keyword};
			} else if("category" in req.params){
				options = {category: req.params.category};
			} else {
				res.send(400, {error: "Please enter a search term", venues: []});
				return next();
			}
			
			console.log("Request for venues " + radius +"m around lat: " + lat + ", lng: " + lng);
			
			that.searchForVenues(lat, lng, radius, options, function(venues){
				if(venues != null) {
					if(venues == "searching")
						res.send(202, {venues: [], error: "We are searching for venues"});
					else {
						if(venues.length > 0)
							res.send(200, {venues: venues, error: "false"});
						else
							res.send(404, {venues: [], error: "No venues found"});
					}
				} else
					res.send(500, {venues: [], error: "There was an error"}); 
			});
			
			return next();
			
		}
		
		var lat;
		var lng;
		var radius;
		
		if("lat" in req.params && "lng" in req.params && "radius" in req.params){
			lat = req.params.lat;
			lng = req.params.lng;
			radius = req.params.radius;
			doSearch(lat, lng, radius);
		} else if("city" in req.params && "radius" in req.params){
			GoogleImport.convertToLatLng(req.params.city, function(ll){
				if(ll != null){
					lat = ll.lat;
					lng = ll.lng;
					radius = req.params.radius;
					doSearch(lat, lng, 2000);
				} else {
					console.log("Could not convert city to coordinates");
					res.send(500, {venues: [], error: "This place does not exist on earth"});
					return next();
				}
			});
		} else {
			console.log("Request without search location or radius received");
			res.send(400, {venues: [], error: "Please provide a location or your position and a search radius"});
			return next();
		}
	};
	
	/**
	* Handles GET venue requests
	* Sends all details belonging to a venue to the mobile application
	* req.params must contain 'id' (the id of the venue)
	*/
	that.getVenue = function(req, res, next){
		var tmp = req.params.id;
		
		console.log("Request for venue with id: " + tmp);
		
		that.findVenue(tmp, function(venue){
			if(venue != null){
				venue.error = "false";
				res.send(200, venue);
			}
			else
				res.send(404, {error: "Venue not found"});
		});
		return next();
	};
	
	
	
	/**
	* Retrieves the rating of a user for a venue and executes the callback function on it
	*/
	that.findRating = function(venue, user, callback){
		database.connection.query("SELECT * FROM venue_rating WHERE venue=? AND user_id=?", [venue, user], function(err, rows, fields){
			if(!err){
				for(var i=0; i<rows.length; i++){
					var rating = {
						user: rows[i].user_id,
						venue: rows[i].venue,
						rating: rows[i].rating,
						timestamp: rows[i].timestamp
					}
					callback(rating);
					return;
				}
			} else {
				console.log("Error querying DB for venue rating");
			}
			callback(null);
		});
	};
	
	/**
	* Inserts a rating of a user for a venue and executes the callback function on it
	*/
	that.insertRating = function(rating, callback){
		database.connection.query("INSERT INTO venue_rating SET venue=?, rating=?, user_id=?",
		[rating.venue, rating.rating, rating.user], function(err, result){
			if(!err){
				console.log("Inserted venue rating into DB");
				callback(rating);
			} else {
				console.log("Error trying to insert venue rating into database");
				callback(null);
			}
		});
	};
	
	/**
	* Updates the rating of a user for a venue and executes the callback function on it
	*/
	that.updateRating = function(rating, callback){
		database.connection.query("UPDATE venue_rating SET rating=? WHERE venue=? AND user_id=?",
		[rating.rating, rating.venue, rating.user], function(err, result){
			if(!err){
				console.log("Updated venue rating");
				callback(rating);
			} else {
				console.log("Error updating venue rating");
				callback(null);
			}
		});
	};
	
	/**
	* Retrieves the average rating for a venue and executes the callback function on it
	*/
	that.getAvgForVenue = function(id, callback){
		database.connection.query("SELECT AVG(rating) AS avg FROM venue_rating WHERE venue=?", [id], function(err, rows, fields){
			if(!err){
				for(var i=0; i<rows.length; i++){
					console.log("Avg rating for venue " + id + " is " + rows[i].avg);
					callback(rows[i].avg);
					return;
				}
			} else {
				console.log("Error querying DB for venue avg");
			}
			callback(null);
		});
	};
	
	/**
	* Updates the average rating of a venue and executes the callback function on the venue's id
	*/
	that.updateVenueRating = function(id, rating, callback){
		database.connection.query("UPDATE venues SET rating=? WHERE id=?", [rating, id], function(err, result){
			if(!err){
				console.log("Updated venue: " + id);
				callback(id);
			} else {
				console.log("Error updating venue rating");
				callback(null);
			}
		});
	};
	
	
	
	/**
	* Handles GET user rating for venue requests
	* Retrieves the rating of a user for a venue and sends it to the mobile app
	* req.params must contain 'id' (the venue id)
	*/
	that.getRatingForUser = function(req, res, next){
		if(req.user && req.user.id){
			console.log("Request for rating venue;user: " + req.params.id + ";" + req.user.id);
			that.findRating(req.params.id, req.user.id, function(rating){
				if(rating){
					res.send(200, {error: "false", rating: rating.rating});
				} else {
					res.send(404, {error: "false", rating: -1});
				}
			});
		} else {
			res.send(403, {error: "You are not signed in"});
		}
		return next();
	};
	
	/**
	* Handles POST checkin requests
	* Tries to check in a user into a venue and update the venue's average rating
	* req.body must contain 'id' (the venue id) and 'rating'
	*/
	that.checkIn = function(req, res, next){
		if(req.user && req.user.id){
			if(!req.body.hasOwnProperty('id') || !req.body.hasOwnProperty('rating')){
				res.send(500, {error: "No venue or rating specified"});
			} else {
				checkinModule.checkIn(req.body.id, req.user.id, function(foo){
					if(foo){
						that.findRating(req.body.id, req.user.id, function(rating){
							if(!rating){
								that.insertRating({venue: req.body.id, rating: req.body.rating, user: req.user.id}, function(rating){
									that.getAvgForVenue(req.body.id, function(avg){
										that.updateVenueRating(req.body.id, avg, function(venue){
											if(!venue){
												res.send(404, {error: "Venue does not exist"});
											} else {
												res.send(200, {error: "false"});
											}
										});
									});
								});
							} else {
								that.updateRating({venue: req.body.id, rating: req.body.rating, user: req.user.id}, function(rating){
									that.getAvgForVenue(req.body.id, function(avg){
										that.updateVenueRating(req.body.id, avg, function(venue){
											if(!venue){
												res.send(404, {error: "Venue does not exist"});
											} else {
												res.send(200, {error: "false"});
											}
										});
									});
								});
							}
						});
					} else {
						res.send(429, {error: "You must wait four hours between checkins"});
					}
				});
			}
		} else {
			res.send(403, {error: "You are not signed in"});
		}
		return next();
	};
	
}

module.exports = new venueModule();