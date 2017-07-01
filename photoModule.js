function photoModule(){
	
	
	var that = this;
	
	var fs = require('fs');
	var database = require('./database');
	
	//that.photoDir = process.env.OPENSHIFT_DATA_DIR; //does not work...
	that.photoDir = "../../../teamuniformdata";//+process.env.PWD;
	that.photoDir = "photos"
	that.photoFilePath = that.photoDir + "/photo";
	//that.photoDir = "../testfolder"
	
	that.findPhoto = function(id, callback){
		
	}
	
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
	
	that.getVenue = function(req, res, next){
		
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
	};
}

module.exports = new photoModule();