function friendModule(){
	var that = this;
	var database = require('./database');
	var commentModule = require('./commentModule');
    var mail = require("nodemailer").mail;

	that.postfriend = function (req, res, next){

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



    that.deleteUser = function (req, res, next){
			var friendid= req.params.friendid;
			if( !friendid ){
					res.json({'error': 'Insufficient Parameters'});
			} else {
        var query = 'DELETE FROM user_friendship WHERE (user_a=? and user_b=?) or (user_b=? and user_a=?)';//console.log('in delete')
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



    that.profileSearch = function (req, res, next){
        if( req.params.name ){
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

                    var queryParams;
                    if(req.params.name.length < 3){
                        queryParams = [friendIDs.join(), req.params.name+'%', req.params.name+'%', req.params.name];
                    } else {
                        queryParams = [friendIDs.join(), '%'+req.params.name+'%', '%'+req.params.name+'%', req.params.name];
                    }
                    database.connection.query('SELECT * FROM users WHERE id NOT IN (?) AND (username LIKE ? OR realName LIKE ? OR eMail = ?)', queryParams, function (error, rows, fields) {
                        if (!error){
                            var friendsObj=[];
                            for(var j = 0; j < rows.length; j++){
                                friendsObj[j] = {
                                    'id': rows[j].id,
                                    'name': rows[j].username,
                                    'realname': rows[j].realName
                                }
                            }

                            res.json({
                                'error': false,
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

        } else {
            res.json({'error': 'No search parameter provided'});
        }
        return next();
    }

    that.profileSearchByLocation = function (req, res, next){
        console.log(req.params.name.length)
        if( req.params.lat && req.params.lng && req.params.radius ){
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

                    var queryParams;
                    if(req.params.name.length < 3){
                        queryParams = [friendIDs.join(), req.params.name+'%', req.params.name+'%', req.params.name];
                    } else {
                        queryParams = [friendIDs.join(), '%'+req.params.name+'%', '%'+req.params.name+'%', req.params.name];
                    }
                    database.connection.query('SELECT * FROM users WHERE id NOT IN (?) AND (username LIKE ? OR realName LIKE ? OR eMail = ?)', queryParams, function (error, rows, fields) {
                        if (!error){
                            var friendsObj=[];
                            for(var j = 0; j < rows.length; j++){
                                friendsObj[j] = {
                                    'id': rows[j].id,
                                    'name': rows[j].username,
                                    'realname': rows[j].realName
                                }
                            }

                            res.json({
                                'error': false,
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

        } else {
            res.json({'error': 'no name'});
        }

        return next();
    }
}

module.exports = new friendModule();
