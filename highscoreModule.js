function highscoreModule() {
	
	var that = this;
	var database = require('./database');



	that.getList = function (req, res, next){
		
		query = "SELECT username, COUNT(username) AS amount FROM users, user_checkin_venue WHERE users.id = user_checkin_venue.userID GROUP BY username ORDER BY COUNT(username)";
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
		
	};

module.exports = new highscoreModule();