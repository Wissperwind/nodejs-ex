function friendModule(){
	var that = this;
	var database = require('./database');
	var commentModule = require('./commentModule');
	var checkinModule = require('./checkinModule');
	var photoModule = require('./photoModule');

	/**
	* Handles POST friendship requests
	* Creates a friendship between two users, either via the other user's id or the id of a comment another user has written
	* Also creates an appropriate notification
	* req.body must contain 'userid' or 'commentid'
	*/
	that.putfriend = function (req, res, next){

		function processFriend(user){
			if(user == req.user.id){
				res.send(400, {error: "You can't make friends with yourself"});
				return next();
			}
			findFriends(req.user.id, function(friends){
				if(friends && user in friends){
					res.send(400, {error: "You are already friends"});
					return next();
				} else {
					var post  = {
						'user_a': req.user.id,
						'user_b': user
					};
					var query = database.connection.query('INSERT INTO user_friendship SET ?', post, function (error, results, fields) {
						if (!error){
							console.log('Last insert ', results);
							res.send(200, {error: "false"});
							
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
								 [user], function (error, results, fields) {
									if (!error){
										
										for(var i=0; i<results.length; i++){
											receiveUsername = results[i].username
											};
									}
								
									//insert the notification
									post  = {
											'username': receiveUsername,
											'message':  sendUsername + " started a friendship with you" 
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
						} else {
							console.log(error);
							console.log(error.code)
							response = null;
							if(error.code === 'ER_DUP_ENTRY')
								response = {
									"error": "You are already friends"
								};
							res.send(400, response);
						}
					});
				}
			});
		}

		if( !req.body.hasOwnProperty('userid') && !req.body.hasOwnProperty('commentid') ){
				res.json({'error': 'Insufficient Parameters'});
		} else {
			if (req.body.hasOwnProperty('commentid')){
				commentModule.findComment(req.body.commentid, function(comment){
					processFriend(comment.user);
				});
			} else{
				processFriend(req.body.userid);
			}
		}
	}

	/**
	* Retrieves an object listing all friends of a user (defined by its 'id') from the database and executes the callback function on it
	*/
	function findFriends(id, callback){

		database.connection.query("SELECT user_friendship.*,users_a.*,users_b.id AS id2,users_b.username AS username2,users_b.realName AS realName2,users_b.lastLat AS lastLat2,users_b.lastLong AS lastLong2 FROM user_friendship LEFT JOIN users AS users_a ON (user_a = users_a.id) LEFT JOIN users AS users_b ON (user_b = users_b.id) WHERE user_a=? OR user_b=?", [id, id], function(err, rows, fields){
			if(!err){
				var friends = {};
				var friend = {};
				for(var i=0; i<rows.length; i++){
					if(rows[i].id == id){ // if user_a is the user and user_b is the friend
						friend = {
							id: rows[i].id2,
							name: rows[i].username2,
							realname: rows[i].realName2,
							lat: rows[i].lastLat2,
							lng: rows[i].lastLong2
						};
					} else { // if user_b is the user and user_a is the friend
						friend = {
							id: rows[i].id,
							name: rows[i].username,
							realname: rows[i].realName,
							lat: rows[i].lastLat,
							lng: rows[i].lastLong
						};
					}
					friends[friend.id] = friend;
				}
				callback(friends);
			} else {
				console.log(err.code);
				callback(null);
			}
		});
	}

	/**
	* Handles GET friends requests
	* Sends all friends and some details to the mobile application
	*/
    that.getUserfriend = function (req, res, next){

		findFriends(req.user.id, function(friends){
			if(friends){
				var friendslist = [];
				for(var i in friends)
					friendslist.push(friends[i]);
				res.send(200, {error: "false", friends: friendslist});
			} else {
				res.send(500, {error: "Could not get your friends"});
			}
		});

        return next();
    }
	
	/**
	* Handles GET friend profile requests
	* Sends all available details of a friend profile to the mobile application
	* req.params must contain 'userid' (the friend's user id)
	*/
	that.getFriendInfo = function (req, res, next){
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


	/**
	* Handles DELETE friendship requests
	* Deletes the friendship between two users and sends the result's status to the mobile application
	* req.params must contain 'friendid'
	*/
    that.deleteUser = function (req, res, next){
			var friendid= req.params.friendid;
			if( !friendid ){
					res.json({'error': 'Insufficient Parameters'});
			} else {
        var query = 'DELETE FROM user_friendship WHERE (user_a=? and user_b=?) or (user_a=? and user_b=?)';
        database.connection.query(query, [req.user.id,friendid,friendid,req.user.id], function (error, results, fields) {
            if (!error){
                console.log(results.affectedRows + " record deleted");
                res.json({
                    "error": 'false'
                });
            } else {
                console.log(error.code);
                res.json({
                    "error": "Friend could not be unfriended"
                });
            }
        });
			}
        return next();
    }


    /**
     * Search user profiles by name
     * @param {String} name - attempts to make a match with username, real name or full email address
     */
    that.profileSearch = function (req, res, next){
        if( ( typeof req.body == 'object' && !req.body.hasOwnProperty('name')  ) || req.params.name == '' || (typeof req.body !== 'object' && Object.keys(req.params).length === 0 )){
            res.send(400, {error: 'Insufficient Parameters'});
        } else {
            if(typeof req.body !== 'object'){
                req.body = {
                    'name': req.params.name
                }
            }
            database.connection.query('SELECT * FROM user_friendship WHERE user_a = ? OR user_b = ?', [req.user.id, req.user.id], function (err, results, fields2) {
                if (!err){
                    var  friendIDs = [req.user.id];
                    for(var i=0; i<results.length; i++){
                        if(results[i].user_a == req.user.id){
                            friendIDs.push(results[i].user_b)
                        } else {
                            friendIDs.push(results[i].user_a)
                        }
                    }
                    console.log(friendIDs.join())

                    var queryParams;
                    if(req.params.name.length < 3){
                        queryParams = [req.params.name+'%', req.params.name+'%', req.params.name];
                    } else {
                        queryParams = ['%'+req.params.name+'%', '%'+req.params.name+'%', req.params.name];
                    }
                    database.connection.query('SELECT * FROM users WHERE username LIKE ? OR realName LIKE ? OR eMail = ?', queryParams, function (error, rows, fields) {
                        if (!error){
                            var friendsObj=[];
                            for(var j = 0; j < rows.length; j++){
                                if(!friendIDs.includes(rows[j].id))
                                    friendsObj.push({
                                        'id': rows[j].id,
                                        'name': rows[j].username,
                                        'realname': rows[j].realName
                                    });
                            }
                            var errorResponse = false, responseCode = 200;
                            if(friendsObj.length === 0){
                                errorResponse = 'No users found';
                                responseCode = 400;
							}
                            res.send(responseCode, {
                                'error': errorResponse,
                                'friends': friendsObj
                            });


                        } else {
                            console.log(error.code);
                            res.send(500, {error: "Could not get user profiles"});
                        }
                    });

                } else {
                    console.log(error.code);
                    res.send(500, {error: "Could not get user profiles"});
                }
            });
		}
        return next();
    }

    /**
     * Search user profiles by location
     * Required parameters: lat, lng, radius
     */
    that.profileSearchByLocation = function (req, res, next){
        if( ( typeof req.body == 'object' && ( !req.body.hasOwnProperty('lat') || !req.body.hasOwnProperty('lng') || !req.body.hasOwnProperty('radius') ) ) || ( req.params.lat == '' || req.params.lng == ''|| req.params.radius == '' ) || (typeof req.body !== 'object' && Object.keys(req.params).length === 0 )){
            res.send(400, {error: 'Insufficient Parameters'});
        } else {
            if(typeof req.body !== 'object'){
                req.body = {
                    'lat': req.params.lat,
                    'lng': req.params.lng,
                    'radius': req.params.radius
                }
            }

            database.connection.query('SELECT * FROM user_friendship WHERE user_a = ? OR user_b = ?', [req.user.id, req.user.id], function (err, results, fields2) {
                if (!err){
                    var  friendIDs = [req.user.id];
                    for(var i=0; i<results.length; i++){
                        if(results[i].user_a == req.user.id){
                            friendIDs.push(results[i].user_b)
                        } else {
                            friendIDs.push(results[i].user_a)
                        }
                    }
                    var query = 'SELECT * FROM users WHERE ( acos(sin(users.lastLat * 0.0175) * sin(? * 0.0175) + cos(users.lastLat * 0.0175) * cos(? * 0.0175) * cos((? * 0.0175) - (users.lastLong * 0.0175)) ) * 6371*1000 <= ? )';
                    database.connection.query( query, [req.params.lat, req.params.lat, req.params.lng, req.params.radius], function (error, rows, fields) {
                        if (!error){
                            var friendsObj=[];
                            for(var j = 0; j < rows.length; j++){
                                if(!friendIDs.includes(rows[j].id))
                                    friendsObj.push({
                                        'id': rows[j].id,
                                        'name': rows[j].username,
                                        'realname': rows[j].realName
                                    });
                            }
                            var errorResponse = false, responseCode = 200;
                            if(friendsObj.length === 0){
                                errorResponse = 'No users found';
                                responseCode = 400;
                            }
                            res.send(responseCode, {
                                'error': errorResponse,
                                'friends': friendsObj
                            });

                        } else {
                            console.log(error.code);
                            res.send(500, {error: "Could not get user profiles"});
                        }
                    });

                } else {
                    console.log(error.code);
                    res.send(500, {error: "Could not get user profiles"});
                }
            });
		}

        return next();
    }
}

module.exports = new friendModule();