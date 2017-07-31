function userModule(){
	var that = this;
	var database = require('./database');
	var cityModule = require('./cityModule');
	var checkinModule = require('./checkinModule');
	var photoModule = require('./photoModule');
	var encryptUtils = require('./encryptUtils');
    //var nodemailer = require('nodemailer');
    var mail = require("nodemailer").mail;

		that.postfriend = function (req, res, next){
			if( !req.body.hasOwnProperty('userid') && !req.body.hasOwnProperty('commentid') ){
					res.json({'error': 'Insufficient Parameters'});
			} else {
        var post  = {
            'user_a': req.user.id,
            'user_b': req.body.userid || req.body.commentid
        };
        var query = database.connection.query('INSERT INTO user_friendship SET ?', post, function (error, results, fields) {
            if (!error){
                console.log('Last insert ', results);
                response = {
                    "error": 'false'
                };
                res.send(results);
            } else {
							console.log(error);
                console.log(error.code)
                response = null;
                if(error.code === 'ER_DUP_ENTRY')
                    response = {
                        "error": "User already exists"
                    };
                res.send(response);
            }
        });
			}
    }
    that.getUserfriend = function (req, res, next){
				database.connection.query('SELECT * FROM user_friendship WHERE user_a = ? ', [req.user.id], function (error, results, fields) {
					if (!error){

							res.json(results);


					} else {
						console.log(error.code);
						res.send(500, {error: "Could not get user info."});
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
