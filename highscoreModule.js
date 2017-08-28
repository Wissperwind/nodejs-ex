function highscoreModule() {
	
	var that = this;
	var database = require('./database');


	/**
	* Retrieves a list of all users and their checkins from the database and executes the callback function on it
	*/
	that.loadList = function(callback){
		
		query = "SELECT username, SUM(checkin_count) AS amount FROM users, user_checkin_venue WHERE users.id = user_checkin_venue.userID GROUP BY username ORDER BY SUM(checkin_count) DESC";
			database.connection.query(
			query,
			[],function(err, rows, field){
				if(!err){
					var completeList = [];
					var listEntry;
					for(var i=0; i<rows.length; i++){
						listEntry = {};
						
						
						listEntry.username = rows[i].username;
						listEntry.amount = rows[i].amount;
						
						
						completeList.push(listEntry);
					}
					console.log(completeList);
					callback(completeList);
					return;
				} else {
					console.log("Error querying DB for highscore list");
				}
				callback(null);
			});
			
		};
		
	
	/**
	* Handles GET highscore list requests
	* Sends the highscore list to the mobile application
	*/
	that.getList = function(req, res, next){
	
	
		that.loadList(function(completeList){
			
			if(completeList != null) {
					
				if(completeList.length > 0) {
					res.send(200, {completeList: completeList, error: "false"});
				
				} else {
					res.send(404, {completeList: [], error: "No high score found"});
				}
			} else {
				res.send(500, {completeList: [], error: "There was an error"}); 
			}
			
		});
			
			
		return next();
	};
	
	
	
	};

module.exports = new highscoreModule();