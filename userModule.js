function userModule(){
	var that = this;
	var database = require('./database');
	var cityModule = require('./cityModule');
	var checkinModule = require('./checkinModule');
	var photoModule = require('./photoModule');
	var encryptUtils = require('./encryptUtils');
    var mail = require("nodemailer").mail;

    createUser = function (user, callback){
        var hashResult = encryptUtils.hashPassword(user.password);
        var post  = {
            'username': user.username,
            'eMail': user.email,
            'passworthash': hashResult.hash,
            'salt': hashResult.salt,
            'city': null
        };
        var query = database.connection.query('INSERT INTO users SET ?', post, function (error, results, fields) {
            if (!error){
                console.log('Last insert ID:', results.insertId);
                response = {
                    "error": 'false'
                };
                callback(response);
            } else {
                console.log(error.code)
                response = null;
                if(error.code === 'ER_DUP_ENTRY')
                    response = {
                        "error": "User already exists"
                    };
                callback(response);
            }
        });
    }
    that.signUp = function (req, res, next){
        if( !req.body.hasOwnProperty('username') || !req.body.hasOwnProperty('email') || !req.body.hasOwnProperty('password')){
            res.json({'error': 'Insufficient Parameters'});
        } else {
            user = {
                username: req.body.username,
                email: req.body.email,
                password: req.body.password
            }
            createUser(user, function (response) {
                res.send(200, response);
            });
        }
        return next();
    }
    that.getUserInfo = function (req, res, next){
        console.log('user id is:' + req.user.id);
		checkinModule.findCheckinsByUser(req.user.id, function(checkins){
			photoModule.findPhotoOfUser(req.user.id, function(photoUrl){
				database.connection.query('SELECT * FROM users WHERE id = ?', [req.user.id], function (error, results, fields) {
					if (!error){
						var response = {
							"username" : results[0].username,
							"realname": results[0].realName,
							"email": results[0].eMail,
							"age": results[0].age,
							"city": results[0].city ? results[0].city : "",
							"rank": checkins[0].count ? checkins[0].count : 0,
							"url": photoUrl,
							"error": "false"
						}
						if( results[0].city === null ){
							res.json(response);
						} else {
							database.connection.query('SELECT name FROM cities WHERE id = ?', results[0].city, function (city_error, city_results, city_fields) {
								response.city = city_results[0].name;
								res.json(response);
							});
						}

					} else {
						console.log(error.code);
						res.send(500, {error: "Could not get user info"});
					}
				});
			});
		});
        return next();
    }
    that.updateUserInfo = function (req, res, next){
        if( !req.body.hasOwnProperty('username') || !req.body.hasOwnProperty('realname') || !req.body.hasOwnProperty('email') || !req.body.hasOwnProperty('age') || !req.body.hasOwnProperty('city') ){
            res.json({'error': 'Insufficient Parameters'});
        } else {
            cityModule.getCityID(req.body.city, function (cityID) {
                var query = 'UPDATE users SET username = ?, realName = ?, eMail = ?, age = ?, city = ? WHERE id = ?';
                database.connection.query(query, [req.body.username, req.body.realname, req.body.email, req.body.age, cityID, req.user.id], function (error, results, fields) {
                    if (!error){
                        console.log(results.affectedRows + " record updated")
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
            });
        }
        return next();
    }
    that.deleteUser = function (req, res, next){
        var query = 'DELETE FROM users WHERE id = ?';console.log('in delete')
        database.connection.query(query, [req.user.id], function (error, results, fields) {
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
        return next();
    }

    var getUserID = function (req, res, callback) {
        var userid;
        //if logged out user; requires username parameter
        if(!req.user || !req.user.id){
            console.log(req.method)
            if( typeof req.params.username === 'undefined' && !req.body.hasOwnProperty('username') ){
                res.json({'error': 'Insufficient or incorrect parameters'});
            } else {
                if( req.method === 'GET' ){
                    username = req.params.username;
                } else {
                    username = req.body.username;
                }
                database.connection.query('SELECT id FROM users WHERE username = ?', [username], function (error, results, fields) {
                    if (!error){
                        if(results.length === 0){
                            res.json({
                                error: "Incorrect username!"
                            });
                        } else {
                            userid = results[0].id;
                            callback(userid);
                        }
                    } else {
                        console.log(error.code);
                        res.send(500, {error: "Could not get user ID!"});
                    }
                });
            }
        } else {
            //if logged in, use userid from session
            userid = req.user.id;
            callback(userid);
        }
    }
    that.getPasswordResetToken = function (req, res, next){
        getUserID(req, res, function (result) {
            var userid = result;

            var crypto = require('crypto');
            var pwResetToken = crypto.randomBytes(256).toString('hex').slice(0,8).toLowerCase();
            var query = 'UPDATE users SET pwResetToken = ? WHERE id = ?';
            database.connection.query(query, [pwResetToken, userid], function (error, results, fields) {
                if (!error){
                    console.log(results.affectedRows + " record updated with passwordResetToken");
                    database.connection.query('SELECT * FROM users WHERE id = ?', [userid], function (error, results, fields) {
                        if (!error){
                            mail({
                                from: "Team Uniform <teamuniform@scm.informatik.tu-darmstadt.de>",
                                to: results[0].eMail,
                                subject: "Your account password",
                                html: "<p>Dear "+results[0].realName+",</p><p>There was recently a request to reset the password for your account.</p><p>Please enter the following password reset token in the app to continue resetting your account password: <strong>"+pwResetToken+"</strong></p><div style='margin: 30px 0; border-bottom: 1px solid #d2d2d2;'></div><p>This e-mail message has been delivered from a send-only address. Please do not reply to this message.</p>"
                            });
                            res.json({
                                "error": 'false'
                            });
                        } else {
                            console.log(error.code);
                            res.send(500, {error: "Could not get user info"});
                        }
                    });
                } else {
                    console.log('Could not add password reset token!'+error.code)
                    res.json({
                        "error": 'Could not add password reset token!'
                    });
                }

            });
            return next();


        });
    }
    that.updatePassword = function (req, res, next){
        getUserID(req, res, function (result) {
            var userid = result;
            if( !req.body.hasOwnProperty('newpassword') || !req.body.hasOwnProperty('safetystring') ){
                res.json({'error': 'Insufficient Parameters'});
            } else {
                var query = 'SELECT pwResetToken FROM users WHERE id = ?';
                database.connection.query(query, [userid], function (error, results, fields) {
                    if (!error){
                        if(results[0].pwResetToken === ''){
                            res.json({
                                error: 'Password reset token does not exist!'
                            });
                        } else if(results[0].pwResetToken === req.body.safetystring){
                            console.log('password matches')
                            var hashResult = encryptUtils.hashPassword(req.body.newpassword);
                            var query = 'UPDATE users SET pwResetToken = ?, passworthash = ?, salt = ? WHERE id = ?';
                            database.connection.query(query, ['', hashResult.hash, hashResult.salt, userid], function (error, results, fields) {
                                if (!error){
                                    console.log("password updated")
                                    res.json({
                                        "error": 'false'
                                    });
                                } else {
                                    console.log('Password not updated! Error code: '+error.code);
                                    res.json({
                                        "error": 'Password not updated! Error code: '+error.code
                                    });
                                }
                            });
                        } else {
                            res.json({
                                error: 'Incorrect password reset token!'
                            });
                        }
                    } else {
                        console.log('Password reset token retrieval error!: '+error.code)
                        res.json({
                            "error": 'Password reset token retrieval error!'
                        });
                    }
                });
            }
            return next();
        });
    }



    that.findUser = function(id, callback){
        database.connection.query("SELECT * FROM users WHERE id=?", [id], function(err, rows, fields){
            if(!err){
                for(var i=0; i<rows.length; i++){
                    var user = {
                        id: rows[i].id,
                        username: rows[i].username
                    }
                    callback(user);
                    return;
                }
            } else {
                console.log("Error querying DB for user");
            }
            callback(null);
        });
    };

    that.updateLastPos = function(id, lat, lng, callback){
        database.connection.query("UPDATE users SET lastLat=?, lastLong=? WHERE id=?", [lat, lng, id], function(err, result){
            if(!err){
                console.log("Updated user position");
                callback(id);
            } else {
                console.log("Error updating user position");
                console.log(err);
                callback(null);
            }
        });
    }

    that.putPosition = function(req, res, next){
        if(req.user && req.user.id){
            if(!req.body.hasOwnProperty('lat') || !req.body.hasOwnProperty('lng')){
                res.send(400, {error: "No lat and/or lng specified."});
            } else {
                that.updateLastPos(req.user.id, req.body.lat, req.body.lng, function(id){
                    if(id){
                        res.send(200, {error: "false"});
                    } else {
                        res.send(500, {error: "Could not update user position"});
                    }
                });
            }
        } else {
            res.send(403, {error: "You are not signed in"});
        }
        return next();
    };

}

module.exports = new userModule();