function chatModule(){
	var that = this;
	var database = require('./database');
	var cityModule = require('./cityModule');
	var checkinModule = require('./checkinModule');
	var photoModule = require('./photoModule');
	var encryptUtils = require('./encryptUtils');
    //var nodemailer = require('nodemailer');
    var mail = require("nodemailer").mail;

    that.getchat = function (req, res, next){
		var friendid= req.params.friendid;
		if( !friendid ){
				res.json({'error': 'Insufficient Parameters'});
		} else {
			//database.connection.query('SELECT *,UNIX_TIMESTAMP(user_chat.changed) AS date FROM user_chat WHERE (user_a = ? and user_b = ?) or (user_a = ? and user_b = ?) ORDER BY changed ASC',
			database.connection.query('SELECT * FROM user_chat WHERE (user_a = ? and user_b = ?) or (user_a = ? and user_b = ?) ORDER BY changed ASC',
			 [req.user.id, friendid, friendid, req.user.id], function (error, results, fields) {
				if (!error){
					var messages = [];
					for(var i=0; i<results.length; i++){
						var date = new Date(results[i].date*1000);
						var message = {
							// year: date.getFullYear(),
							// month: date.getMonth() + 1,
							// day: date.getDate(),
							// hour: date.getHours(),
							// minute: date.getMinutes(),
							// second: date.getSeconds(),
							timestamp: results[i].timestamp,
							text: results[i].message,
							owncomment: results[i].user_a == req.user.id
						};
						messages.push(message);
					}
					res.send(200, {error: "false", chat: messages});

						//res.json(results);


				} else {
					console.log(error.code);
					res.send(500, {error: "Could not find the chat with your friend"});
				}
			});
		}
        return next();
    }

	that.postchat = function (req, res, next){

		if( !req.body.hasOwnProperty('friendid') || !req.body.hasOwnProperty('text') || !req.body.hasOwnProperty('timestamp')){
		//if( !req.body.hasOwnProperty('friendid') || !req.body.hasOwnProperty('text')){
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
		
		var sendUername;
		
		database.connection.query('SELECT username FROM users WHERE id = ?',
		 [req.user.id], function (error, results, fields) {
			if (!error){
				
				for(var i=0; i<results.length; i++){
					sendUername = results[i].username
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
						'message': "New message from " + sendUername
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


		that.getUserInfo = function (req, res, next){
			if( !req.params.hasOwnProperty('userid') ){
					res.json({'error': 'Insufficient Parameters'});
			} else {

		checkinModule.findCheckinsByUser(req.params.userid, function(checkins){
			photoModule.findPhotoOfUser(req.params.userid, function(photoUrl){
				database.connection.query('SELECT * FROM users WHERE id = ?', [req.params.userid], function (error, results, fields) {
					if (!error){
						var response = {
							"id": req.params.userid,
							"name" : results[0].username,
							"realname": results[0].realName,
							"email": results[0].eMail,
							"age": results[0].age,
							"city": results[0].city  ? results[0].city : "",
							"rank": checkins[0].count ? checkins[0].count : 0,
							"url": photoUrl,
							"lat": results[0].lastLat,
							"lng": results[0].lastLong,
							"error": "false"
						}
						if( results[0].city === null ){
							res.send(200, response);
						} else {
							database.connection.query('SELECT name FROM cities WHERE id = ?', results[0].city, function (city_error, city_results, city_fields) {
								response.city = city_results[0].name;
								res.send(200, response);
							});
						}

					} else {
						console.log(error.code);
						res.send(500, {error: "Could not get user info"});
					}
				});
			});
		});
	}
				return next();
		}


}

module.exports = new chatModule();
