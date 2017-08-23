function chatModule(){
	var that = this;
	var database = require('./database');
	
	/**
	* Retrieves all chat messages that belong to the chat between user_a and user_b from the database and sends the results to the mobile app
	* req.params must contain friendid
	*/
    that.getchat = function (req, res, next){
		var friendid= req.params.friendid;
		if( !friendid ){
				res.json({'error': 'Insufficient Parameters'});
		} else {
			database.connection.query('SELECT * FROM user_chat WHERE (user_a = ? and user_b = ?) or (user_a = ? and user_b = ?) ORDER BY changed ASC',
			 [req.user.id, friendid, friendid, req.user.id], function (error, results, fields) {
				if (!error){
					var messages = [];
					for(var i=0; i<results.length; i++){
						var message = {
							timestamp: results[i].timestamp,
							text: results[i].message,
							owncomment: results[i].user_a == req.user.id
						};
						messages.push(message);
					}
					res.send(200, {error: "false", chat: messages});

				} else {
					console.log(error.code);
					res.send(500, {error: "Could not find the chat with your friend"});
				}
			});
		}
        return next();
    }

	/**
	* Inserts a chat message and an appropriate notification into the database and sends a status response to the mobile app
	* req.body must contain friendid, text and timestamp
	*/
	that.postchat = function (req, res, next){

		if( !req.body.hasOwnProperty('friendid') || !req.body.hasOwnProperty('text') || !req.body.hasOwnProperty('timestamp')){
				res.json({'error': 'Insufficient Parameters'});
		} else {
			var post  = {
					'user_a': req.user.id,
					'user_b': req.body.friendid,
					'message': req.body.text,
					'timestamp': req.body.timestamp
			};
			var query = database.connection.query('INSERT INTO user_chat SET ?', post, function (error, results, fields) {
					if (!error){
							console.log('Last insert ', results);
							response = {
									"error": 'false'
							};
							res.send(response);
					} else {
						console.log(error);
							console.log(error.code)
							response = null;
							if(error.code === 'ER_DUP_ENTRY')
									response = {
											"error": "There was an error with the chat"
									};
							res.send(response);
					}
			});
			
			//Add a notification to the notification table
			
			//get the username of the user
			
			var sendUsername;
			
			database.connection.query('SELECT username FROM users WHERE id = ?',
			 [req.user.id], function (error, results, fields) {
				if (!error){
					
					for(var i=0; i<results.length; i++){
						sendUsername = results[i].username
						};
				}
				
				//get the username of the friend
			
				var receiveUsername;
				
				database.connection.query('SELECT username FROM users WHERE id = ?',
				 [req.body.friendid], function (error, results, fields) {
					if (!error){
						
						for(var i=0; i<results.length; i++){
							receiveUsername = results[i].username
							};
					}
				
					//insert the notification
					post  = {
							'username': receiveUsername,
							'message': "New message from " + sendUsername
					};
					
					var query = database.connection.query('INSERT INTO notifications SET ?', post, function (error, results, fields) {
						if (!error){
							console.log('notification inserted');
						} else {
							console.log('error while inserting the notification');
							console.log(error);
							console.log(error.code)
								
						}
					});
				});
			});
		}
	}
}

module.exports = new chatModule();
