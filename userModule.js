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
}

module.exports = new userModule();