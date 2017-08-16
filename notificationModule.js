function notificationModule() {
	
	var that = this;
	var database = require('./database');



	that.loadNotifications = function(callback){
		
		if( !req.body.hasOwnProperty('username')){
            res.json({'error': 'Insufficient Parameters'});
        } else {
		
		
			query = "SELECT message FROM notifications WHERE username = ?";
				database.connection.query(
				query,
				[req.body.username],function(err, rows, field){
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
					callback(null);
				});
			}	
		};
		
	
	
	that.getNotifications = function(req, res, next){
	
	
		that.loadNotifications(function(completeList){
			
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
	};
	
	
	
	};

module.exports = new notificationModule();