function userModule(){
	var that = this;
	var database = require('./database');
	var cityModule = require('./cityModule');
	var checkinModule = require('./checkinModule');
	var commentModule = require('./commentModule');
	var photoModule = require('./photoModule');
	var encryptUtils = require('./encryptUtils');
    //var nodemailer = require('nodemailer');
    var mail = require("nodemailer").mail;

		that.postfriend = function (req, res, next){
			if( !req.body.hasOwnProperty('userid') && !req.body.hasOwnProperty('commentid') ){
					res.json({'error': 'Insufficient Parameters'});
			} else {
				if (req.body.hasOwnProperty('commentid')){
					commentModule.findComment(req.body.commentid, function(comment){
						var post  = {
							'user_a': req.user.id,
							'user_b': comment.user
						};
						var query = database.connection.query('INSERT INTO user_friendship SET ?', post, function (error, results, fields) {
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
										"error": "You are already friends"
									};
								res.send(response);
							}
						});
					});
				} else{
					var post  = {
						'user_a': req.user.id,
						'user_b': req.body.userid
					};
					var query = database.connection.query('INSERT INTO user_friendship SET ?', post, function (error, results, fields) {
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
									"error": "You are already friends"
								};
							res.send(response);
						}
					});
				}
			}
		}
    that.getUserfriend = function (req, res, next){
				database.connection.query('SELECT * FROM user_friendship LEFT JOIN users ON (user_b = id) WHERE user_a = ? ', [req.user.id], function (error, rows, fields) {
					if (!error){
						var friends = [];
						for(var i=0; i<rows.length; i++){
							var friend = {
								id: rows[i].id,
								name: rows[i].username,
								realname: rows[i].realName,
								lat: rows[i].lastLat,
								lng: rows[i].lastLong
							}
							friends.push(friend);
						}
						res.send(200, {error: "false", friends: friends});

							//res.json(results);


					} else {
						console.log(error.code);
						res.send(500, {error: "Could not get user friends."});
					}
				});

        return next();
    }



    that.deleteUser = function (req, res, next){
			var friendid= req.params.friendid;
			if( !friendid ){
					res.json({'error': 'Insufficient Parameters'});
			} else {
        var query = 'DELETE FROM user_friendship WHERE user_a = ? and user_b =?';console.log('in delete')
        database.connection.query(query, [req.user.id,friendid], function (error, results, fields) {
            if (!error){
                console.log(results.affectedRows + " record deleted");
                req.session.destroy();
                res.json({
                    "error": 'false'
                });
            } else {
                console.log(error.code);
                res.json({
                    "error": error.code
                });
            }
        });
			}
        return next();
    }
}

module.exports = new userModule();
