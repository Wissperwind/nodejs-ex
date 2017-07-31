function userModule(){
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
				database.connection.query('SELECT * FROM user_chat WHERE (user_a = ? and user_b = ?) and (user_a = ? and user_b = ?)',
				 [req.user.id,friendid,friendid,req.user.id], function (error, results, fields) {
					if (!error){

							res.json(results);


					} else {
						console.log(error.code);
						res.send(500, {error: "Could not get user info."});
					}
				});
}
        return next();
    }

		that.postchat = function (req, res, next){

			if( !req.body.hasOwnProperty('friendid') ){
					res.json({'error': 'Insufficient Parameters'});
			} else {
				var post  = {
						'user_a': req.user.id,
						'user_b': req.body.friendid ,
						'message': req.body.message
				};
				var query = database.connection.query('INSERT INTO user_chat SET ?', post, function (error, results, fields) {
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


		that.getUserInfo = function (req, res, next){

			if( !req.body.hasOwnProperty('userid') ){
					res.json({'error': 'Insufficient Parameters'});
			} else {

		checkinModule.findCheckinsByUser(userid, function(checkins){
			photoModule.findPhotoOfUser(userid, function(photoUrl){
				database.connection.query('SELECT * FROM users WHERE id = ?', [req.body.userid], function (error, results, fields) {
					if (!error){
						var response = {
							"username" : results[0].username,
							"realname": results[0].realName,//updated database to remove space in 'real Name'
							"email": results[0].eMail,//updated database to remove hyphen in 'e-Mail'
							"age": results[0].age,
							"city": results[0].city,
							"rank": checkins[0].count,
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
						res.send(500, {error: "Could not get user info."});
					}
				});
			});
		});
	}
				return next();
		}


}

module.exports = new userModule();
