function chatModule(){
	var that = this;
	var database = require('./database');

    that.getchat = function (req, res, next){
		var friendid= req.params.friendid;
		if( !friendid ){
				res.json({'error': 'Insufficient Parameters'});
		} else {
			database.connection.query(	'DELETE FROM notifications WHERE username IN (SELECT username FROM users WHERE id = ?) AND CONCAT("New message from ", (SELECT username FROM users WHERE id = ?)) = message;'+
										'SELECT * FROM user_chat WHERE (user_a = ? and user_b = ?) or (user_a = ? and user_b = ?) ORDER BY changed ASC',
			 [req.user.id, friendid, req.user.id, friendid, friendid, req.user.id], function (error, results, fields) {
				if (!error){
					var messages = [];
					for(var i=0; i<results[1].length; i++){
						// var date = new Date(results[1][i].date*1000);
						var message = {
							// year: date.getFullYear(),
							// month: date.getMonth() + 1,
							// day: date.getDate(),
							// hour: date.getHours(),
							// minute: date.getMinutes(),
							// second: date.getSeconds(),
							timestamp: results[1][i].timestamp,
							text: results[1][i].message,
							owncomment: results[1][i].user_a == req.user.id
						};
						messages.push(message);
					}
					res.send(200, {error: "false", chat: messages});

				} else {
					console.log(error.code);
					console.log(error);
					res.send(500, {error: "Could not find the chat with your friend"});
				}
			});
		}
        return next();
    }

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
