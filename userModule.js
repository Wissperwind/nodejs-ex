function userModule(){
	var that = this;
	var database = require('./database');
	var cityModule = require('./cityModule');
	var encryptUtils = require('./encryptUtils');
    //var nodemailer = require('nodemailer');

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
        console.log('user id is:' + req.user.id)
        database.connection.query('SELECT * FROM users WHERE id = ?', [req.user.id], function (error, results, fields) {
            if (!error){
                var response = {
                    "username" : results[0].username,
                    "realname": results[0].realName,//updated database to remove space in 'real Name'
                    "email": results[0].eMail,//updated database to remove hyphen in 'e-Mail'
                    "age": results[0].age,
                    "city": results[0].city
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
            }
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
                    console.log('goes in here')
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
    that.resetPassword = function (req, res, next){

        var mail = require("nodemailer").mail;

        mail({
            from: "Fred Foo ✔ <foo@blurdybloop.com>", // sender address
            to: "faaz.iqbal@gmail.com", // list of receivers
            subject: "Hello ✔", // Subject line
            text: "Hello world ✔", // plaintext body
            html: "<b>Hello world ✔</b>" // html body
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