function userModule(){
	
	var that = this;
	
	var database = require('./database');
	var crypto = require('crypto');
	
    const iterations    = 100000;
    const keylen        = 16;

    var hashPassword = function(password) {
        var salt = crypto.randomBytes(256).toString('base64').slice(0,5);
        var hash = crypto.pbkdf2Sync(password, salt, iterations, keylen, 'sha512').toString('hex');
        return {
            salt: salt,
            hash: hash
        };
    };

    that.createUser = function (user, callback){
        var hashResult = hashPassword(user.password);
        var post  = {
            'username': user.username,//changed to UNIQUE key in the DB
            'e-Mail': user.email,
            'passworthash': hashResult.hash,
            'salt': hashResult.salt,
            'city': 1//foreign key issue forcing to add a default city
        };
        var query = database.connection.query('INSERT INTO users SET ?', post, function (error, results, fields) {
            if (!error){
                console.log('Last insert ID:', results.insertId);
                response = {
                    "login_successful": true,
                    "user_already_exists": false
                };
                callback(response);
            } else {
                console.log(error.code)
                response = null;
                if(error.code === 'ER_DUP_ENTRY')
                    response = {
                        "login_successful": false,
                        "user_already_exists": true
                    };
                callback(response);
            }
        });
    }
	
    var isPasswordCorrect = function(savedHash, savedSalt, passwordAttempt) {
        return savedHash == crypto.pbkdf2Sync(passwordAttempt, savedSalt, iterations, keylen, 'sha512').toString('hex');
    }
	
    // Lookup a user in our database
    that.lookupUser = function(username, password, done) {

        var query = 'SELECT * FROM users WHERE username = ?';
        database.connection.query(query, [username], function (error, results, fields) {
            if (!error){
                if( results.length != 0 ){
                    if( isPasswordCorrect(results[0].passworthash, results[0].salt, password) ){
                        return done(null, {id:results[0].id, username:username});
                    } else {
                        return done(null, false, { error: 'Incorrect password.' });
                    }
                } else {
                    return done(null, false, { error: 'Incorrect username' });
                }

                // response = {
                //     "login_successful": true,
                //     "user_already_exists": false
                // };
                // callback(response);
            } else {
                console.log('no result')
                console.log(error.code)
                response = null;
                if(error.code === 'ER_DUP_ENTRY')
                    response = {
                        "login_successful": false,
                        "user_already_exists": true
                    };
                //callback(response);
            }
        });

    };
	
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
						res.send(500, {error: "Could not update user position."});
					}
				});
			}
		} else {
			res.send(403, {error: "You are not signed in."});
		}
		return next();
	};
}

module.exports = new userModule();