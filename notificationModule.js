function notificationModule() {
	
	var that = this;
	var database = require('./database');



	that.loadNotifications = function(req, callback){
		
		
		query = "SELECT message FROM notifications WHERE username = ?";
			database.connection.query(
			query,
			[req.params.username],function(err, rows, field){
				if(!err){
					var completeList = [];
					var listEntry;
					for(var i=0; i<rows.length; i++){
						listEntry = {};
						
						
						listEntry.message = rows[i].message;
						
						
						completeList.push(listEntry);
					}
					console.log(completeList);
					callback(completeList);
					return;
				} else {
					console.log("Error querying DB for notifications");
				}
				
				
				
				//remove the notifications once they are collected by the phone
				
				query = "DELETE FROM notifications WHERE username = ?";
				database.connection.query(
				query,
				[req.params.username],function(err, rows, field){
					if (error){
						console.log(error);
						console.log(error.code)
					}
						
				});
				
				callback(null);
			});
		
		};
		
	
	
	that.getNotifications = function(req, res, next){
	
		if(!req.params.username){
				res.json({'error': 'Insufficient Parameters'});
			} else {
		
				that.loadNotifications(req, function(completeList){
					
					if(completeList != null) {
							
						if(completeList.length > 0) {
							res.send(200, {completeList: completeList, error: "false"});
						
						} else {
							res.send(404, {completeList: [], error: "No notifications found"});
						}
					} else {
						res.send(500, {completeList: [], error: "There was an error"}); 
					}
					
				});
					
					
				return next();
			}
		};
	
	
	
	};

module.exports = new notificationModule();