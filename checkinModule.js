function checkinModule(){
	
	var that = this;
	
	var database = require('./database');
	
	/**
	* Retrieves a user-venue pair checkin defined by the venue id and user id from the database and executes the callback function on it
	*/
	that.findCheckin = function(venue, user, callback){
		database.connection.query("SELECT *,UNIX_TIMESTAMP(timestamp) AS time FROM user_checkin_venue WHERE venueID=? AND userID=?", [venue, user], function(err, rows, fields){
			if(!err){
				for(var i=0; i<rows.length; i++){
					var checkin = {
						user: rows[i].userID,
						venue: rows[i].venueID,
						checkins: rows[i].checkin_count,
						time: rows[i].time * 1000
					}
					callback(checkin);
					return;
				}
			} else {
				console.log("Error querying DB for checkin");
			}
			callback(null);
		});
	};
	
	/**
	* Retrieves all user-venue pair checkins for a venue defined by its id from the database, ordered descending by the checkin counters, and executes the callback function on them
	*/
	that.findCheckinsByVenue = function(venueId, callback){
		database.connection.query("SELECT * FROM user_checkin_venue LEFT JOIN users ON (userID = id) WHERE venueID=? ORDER BY checkin_count DESC", [venueId], function(err, rows, fields){
			if(!err){
				var checkins = [];
				for(var i=0; i<rows.length; i++){
					var checkin = {
						user: rows[i].userID,
						venue: rows[i].venueID,
						name: rows[i].username,
						visits: rows[i].checkin_count
					}
					checkins.push(checkin);
				}
				callback(checkins);
				return;
			} else {
				console.log("Error querying DB for venue checkins");
			}
			callback(null);
		});
	};
	
	/**
	* Retrieves all user-venue pair checkins and the sum of the checkin counters of a user from the database and executes the callback function on them
	*/
	that.findCheckinsByUser = function(userId, callback){
		database.connection.query("SELECT *,SUM(checkin_count) AS count FROM user_checkin_venue WHERE userID=?", [userId], function(err, rows, fields){
			if(!err){
				var checkins = [];
				for(var i=0; i<rows.length; i++){
					var checkin = {
						user: rows[i].userID,
						venue: rows[i].venueID,
						checkins: rows[i].checkin_count,
						count: rows[i].count
					}
					checkins.push(checkin);
				}
				callback(checkins);
				return;
			} else {
				console.log("Error querying DB for user checkins");
			}
			callback(null);
		});
	};
	
	/**
	* Inserts a checkin for a user-venue pair into the database and executes the callback function with status "OK" if successful
	*/
	that.createCheckin = function(venue, user, callback){
		database.connection.query("INSERT INTO user_checkin_venue SET userID=?, venueID=?, checkin_count=?",
		[user, venue, 1], function(err, result){
			if(!err){
				console.log("Inserted checkin into DB");
				callback("OK");
			} else {
				console.log("Error trying to insert checkin into database");
				callback(null);
			}
		});
	};
	
	/**
	* Updates (increments) the checkin counter for a user-venue pair and executes the callback function with status "OK" if successful
	*/
	that.updateCheckinCounter = function(venue, user, callback){
		database.connection.query("UPDATE user_checkin_venue SET checkin_count=checkin_count+1 WHERE venueID=? AND userID=?", [venue, user], function(err, result){
			if(!err){
				console.log("Updated checkin count for user "+user);
				callback("OK");
			} else {
				console.log("Error updating checkin count");
				callback(null);
			}
		});
	};
	
	/**
	* Removes a user-venue pair checkin from the database and executes the callback function with status "OK" if successful
	*/
	that.removeCheckin = function(venue, user, callback){
		database.connection.query("DELETE FROM user_checkin_venue WHERE id=?", [venue, user], function(err, rows, fields){
			if(!err){
				console.log("Deleted checkin of user" + user);
				callback("OK");
				return;
			} else {
				console.log("Error deleting checkin from DB");
			}
			callback(null);
		});
	};
	
	
	
	/**
	* Attempts a user checkin into a venue
	* Successful, if the user has not checked in into the venue so far or the last checkin is more than 4 hours ago
	*/
	that.checkIn = function(venue, user, callback){
		that.findCheckin(venue, user, function(checkin){
			if(!checkin){
				that.createCheckin(venue, user, callback);
			}else{
				var d = new Date();
				var t = d.getTime();
				if(t - checkin.time >= 1000 * 60 * 60 * 4) // 4 hours between checkins
					that.updateCheckinCounter(venue, user, callback);
				else
					callback(null);
			}
		});
	};
}

module.exports = new checkinModule();