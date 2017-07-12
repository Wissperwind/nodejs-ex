function photoModule(){
	
	
	var that = this;
	
	var fs = require('fs');
	that.fs = fs;
	var database = require('./database');
	
	//that.photoDir = process.env.OPENSHIFT_DATA_DIR; //does not work...
	that.photoDir = "../../../teamuniformdata";//+process.env.PWD;
	//that.photoDir = "photos"
	that.photoFilePath = that.photoDir + "/photo";
	//that.photoDir = "../testfolder"
	
	that.serverAddress =  "http://teamuniform-teamuniform.7e14.starter-us-west-2.openshiftapps.com";
	//that.serverAddress =  "localhost:8080";
	
	console.log("Photos are in %s, this folder exists: "+fs.existsSync(that.photoDir), that.photoDir);
	
	that.findPhotoPathId = function(id, callback){
		if(id == "defaultVenue" || id == "defaultUser"){
			callback({
				id: id,
				path: id + ".jpg"
			});
		} else {
			database.connection.query("SELECT * FROM photo WHERE id=?", [id], function(err, rows, fields){
				if(!err){
					for(var i=0; i<rows.length; i++){
						var photo = {
							id: rows[i].id,
							path: rows[i].path + rows[i].id + ".jpg"
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
	
	that.addPhotoPathId = function(callback){
		database.connection.query("INSERT INTO photo SET path=?", [that.photoFilePath], function(err, result){
			if(!err){
				var photo = {
					id: result.insertId,
					path: that.photoFilePath + result.insertId + ".jpg"
				};
				//photo.id = result.insertId;
				//photo.path = that.photoFilePath + photo.id + ".jpg";
				console.log("Inserted photo path into DB: "+photo.path);
				callback(photo);
			} else {
				console.log("Error trying to insert photo path into database");
				callback(null);
			}
		});
	};
	
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
	
	that.savePhoto = function(photoFile, callback){
		that.addPhotoPathId(function(photo) {
			that.addPhotoFile(photoFile, photo.path, function(str){
				if(str)
					callback(photo.id);
				else
					callback(null);
			});
		});
	};
	
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
	
/* 	that.downloadPhoto = function(requestObject, callback){
		that.addPhotoPathId(function (photo){
			requestObject.pipe(fs.createWriteStream(photo.path)).on('close', function(){
				callback(photo.id);
			});
		});
	}; */
	
	that.getPhoto = function(req, res, next){
		that.findPhotoPathId(req.params.id, function(photo){
			if(photo){
				that.findPhotoFile(photo.path, function(file){
					if(file){
						res.setHeader("Content-Type", "image/jpeg");
						res.setHeader("Content-Disposition", "inline;filename=\"photo"+photo.id+"\"");
						res.send(200, file);
					} else
						res.send(500, {error: "Server error. Can not get photo."})
				});
			} else {
				res.send(404, {error: "Photo does not exist."});
			}
		});
		return next();
	};
	
	that.postPhotoVenue = function(req, res, next){
		if(req.user && req.user.id){
			if(!req.params.id){
				res.send(400, {error: "No venue was specified for photo upload."});
			} else {
				that.savePhoto(req.body, function(photoId){
					if(photoId){
						that.addPhotoToVenue(req.params.id, photoId, req.user.id, function(str){
							if(str)
								res.send(200, {error: "false"});
							else
								res.send(500, {error: "Could not add photo to venue."});
						});
					} else {
						res.send(500, {error: "Could not save photo."});
					}
				});
			}
		} else {
			res.send(403, {error: "You are not signed in."});
		}
		return next();
	};
	
	that.postPhotoUser = function(req, res, next){
		if(req.user && req.user.id){
			that.savePhoto(req.body, function(photoId){
				if(photoId){
					that.addPhotoToUser(req.user.id, photoId, function(str){
						if(str)
							res.send(200, {error: "false"});
						else
							res.send(500, {error: "Could not add photo to user."});
					});
				} else {
					res.send(500, {error: "Could not save photo."});
				}
			});
		} else {
			res.send(403, {error: "You are not signed in."});
		}
		return next();
	};
}

module.exports = new photoModule();