function photoModule(){
	
	
	var that = this;
	
	var fs = require('fs');
	that.fs = fs;
	var database = require('./database');
	
	that.photoDir = "../../../teamuniformdata";
	that.photoFilePath = that.photoDir + "/photo";
	
	that.serverAddress =  "http://teamuniform-teamuniform.7e14.starter-us-west-2.openshiftapps.com";
	
	console.log("Photos are in %s, this folder exists: "+fs.existsSync(that.photoDir), that.photoDir);
	
	/**
	* Finds the path and id of a photo file belonging to the given photo id and executes the callback function on the result
	*/
	that.findPhotoPathId = function(id, callback){
		if(id == "defaultVenue" || id == "defaultUser"){
			callback({
				id: id,
				format: ".jpg",
				path: id + ".jpg"
			});
		} else {
			database.connection.query("SELECT * FROM photo WHERE id=?", [id], function(err, rows, fields){
				if(!err){
					for(var i=0; i<rows.length; i++){
						var photo = {
							id: rows[i].id,
							format: rows[i].format,
							path: rows[i].path + rows[i].id + rows[i].format
						}
						callback(photo);
						return;
					}
				} else {
					console.log("Error querying DB for photo");
				}
				callback(null);
			});
		}
	};
	
	/**
	* Reads the photo file that is located at the given path and executes the callback on the file data
	*/
	that.findPhotoFile = function(path, callback){
		fs.readFile(path, function(err, data){
			if(!err) {
				callback(data);
			} else {
				console.log(err);
				callback(null);
			}
		})
	};
	
	/**
	* Retrieves the URL addresses of all photos that belong to a venue (defined by id) and executes the callback function on them
	*/
	that.findPhotosOfVenue = function(id, callback){
		database.connection.query("SELECT * FROM venue_has_picture LEFT JOIN photo ON (photo.id = venue_has_picture.photoID) WHERE venueID=?", [id], function(err, rows, fields){
			if(!err){
				var photos = [];
				for(var i=0; i<rows.length; i++){
					var photoURL = that.serverAddress+"/photos/"+rows[i].id;
					photos.push(photoURL);
				}
				if(i == 0)
					photos.push(that.serverAddress+"/photos/defaultVenue");
				callback(photos);
				return;
			} else {
				console.log("Error querying DB for venue photos");
			}
			callback(null);
		});
	};
	
	/**
	* Retrieve the URL address of a user's (defined by id) photo and execute the callback function on it
	*/
	that.findPhotoOfUser = function(id, callback){
		database.connection.query("SELECT * FROM users WHERE id=? AND profilePicture IS NOT NULL", [id], function(err, rows, fields){
			if(!err){
				var photoURL = "";
				for(var i=0; i<rows.length; i++){
					photoURL = that.serverAddress+"/photos/"+rows[i].profilePicture;
				}
				if(i == 0)
					photoURL = that.serverAddress+"/photos/defaultUser";
				callback(photoURL);
				return;
			} else {
				console.log("Error querying DB for user photo");
				console.log(err);
			}
			callback(null);
		});
	};
	
	/**
	* Inserts a photo path and the given photo file format into the database and executes the callback function on the new id and the file path
	*/
	that.addPhotoPathId = function(format, callback){
		database.connection.query("INSERT INTO photo SET path=?, format=?", [that.photoFilePath, format], function(err, result){
			if(!err){
				var photo = {
					id: result.insertId,
					path: that.photoFilePath + result.insertId + format
				};
				console.log("Inserted photo path into DB: "+photo.path);
				callback(photo);
			} else {
				console.log("Error trying to insert photo path into database");
				callback(null);
			}
		});
	};
	
	/**
	* Saves photo data in a file located at the given path and executes the callback function with status "OK" if successful
	*/
	that.addPhotoFile = function(photo, path, callback){
		fs.writeFile(path, photo, function(err){
			if(err){
				console.log(err);
				callback(null);
				return;
			}
			callback("OK");
		});
	};
	
	/**
	* Creates a path for a photo file, saves the given photo file data in a file at that path and executes the callback function on the new id of the inserted photo
	*/
	that.savePhoto = function(photoFile, format, callback){
		that.addPhotoPathId(format, function(photo) {
			that.addPhotoFile(photoFile, photo.path, function(str){
				if(str)
					callback(photo.id);
				else
					callback(null);
			});
		});
	};
	
	/**
	* Inserts an entry that associates a photo (defined by its id) with a venue (defined by its id) and possibly the user (defined by its id) who uploaded it and executes the callback function with status "OK" if successful
	*/
	that.addPhotoToVenue = function(venueId, photoId, userId, callback){
		database.connection.query("INSERT INTO venue_has_picture SET venueID=?, photoID=?, addedFrom=?", [venueId, photoId, userId], function(err, result){
			if(!err){
				console.log("Added photo %s to venue %s from user %s", photoId, venueId, userId);
				callback("OK");
			} else {
				console.log("Error trying to insert photo for venue");
				callback(null);
			}
		});
	};
	
	/**
	* Updates a user's (defined by its id) profile picture with the id of an uploaded photo and executes the callback function with status "OK" if successful
	*/
	that.addPhotoToUser = function(userId, photoId, callback){
		database.connection.query("UPDATE users SET profilePicture=? WHERE id=?", [photoId, userId], function(err, result){
			if(!err){
				console.log("Added photo %s to user %s", photoId, userId);
				callback("OK");
			} else {
				console.log("Error trying to insert photo for user");
				callback(null);
			}
		});
	};
	
	/**
	* Finds the photo file that belongs to the requested id and sends its data to the mobile application
	* req.params must contain id (the id of the photo)
	*/
	that.getPhoto = function(req, res, next){
		that.findPhotoPathId(req.params.id, function(photo){
			if(photo){
				that.findPhotoFile(photo.path, function(file){
					if(file){
						res.setHeader("Content-Type", photo.format == ".jpg" ? "image/jpeg" : "image/png");
						res.setHeader("Content-Disposition", "inline;filename=\"photo"+photo.id+"\"");
						res.send(200, file);
					} else
						res.send(500, {error: "Server error. Can not get photo"})
				});
			} else {
				res.send(404, {error: "Photo does not exist"});
			}
		});
		return next();
	};
	
	/**
	* Saves the received photo data in a file and associates it with a venue
	* req.params must contain id (the venue id)
	* req.body must contain the photo data only
	*/
	that.postPhotoVenue = function(req, res, next){
		if(req.user && req.user.id){
			if(!req.params.id){
				res.send(400, {error: "No venue was specified for photo upload"});
			} else if(req.headers["content-type"] != "image/jpeg" && req.headers["content-type"] != "image/png"){
				res.send(400, {error: "Only JPEG and PNG images are allowed"});
			} else {
				that.savePhoto(req.body, req.headers["content-type"] == "image/jpeg" ? ".jpg" : ".png", function(photoId){
					if(photoId){
						that.addPhotoToVenue(req.params.id, photoId, req.user.id, function(str){
							if(str)
								res.send(200, {error: "false"});
							else
								res.send(500, {error: "Could not add photo to venue"});
						});
					} else {
						res.send(500, {error: "Could not save photo"});
					}
				});
			}
		} else {
			res.send(403, {error: "You are not signed in"});
		}
		return next();
	};
	
	/**
	* Saves the received photo data in a file and associates it with a user profile
	* req.body must contain the photo data only
	*/
	that.postPhotoUser = function(req, res, next){
		if(req.user && req.user.id){
			if(req.headers["content-type"] != "image/jpeg" && req.headers["content-type"] != "image/png"){
				res.send(400, {error: "Only JPEG and PNG images are allowed"});
			} else {
				that.savePhoto(req.body, req.headers["content-type"] == "image/jpeg" ? ".jpg" : ".png", function(photoId){
					if(photoId){
						that.addPhotoToUser(req.user.id, photoId, function(str){
							if(str)
								res.send(200, {error: "false"});
							else
								res.send(500, {error: "Could not add photo to user"});
						});
					} else {
						res.send(500, {error: "Could not save photo"});
					}
				});
			}
		} else {
			res.send(403, {error: "You are not signed in"});
		}
		return next();
	};
}

module.exports = new photoModule();