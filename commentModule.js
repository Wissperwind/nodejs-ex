function commentModule(){
	
	var that = this;
	
	var database = require('./database');
	
	
	that.getComment = function(id, callback){
		database.connection.query("SELECT * FROM comment WHERE id=?", [id], function(err, rows, fields){
			if(!err){
				for(var i=0; i<rows.length; i++){
					var comment = {
						id: rows[i].id,
						user: rows[i].userID,
						venue: rows[i].venueID,
						photo: rows[i].photoID,
						text: rows[i].text,
						timestamp: rows[i].timestamp
					}
					callback(comment);
					return;
				}
			} else {
				console.log("Error querying DB for comment");
			}
			callback(null);
		});
	};
	
	that.getCommentsByVenue = function(venueId, callback){
		database.connection.query("SELECT comment.*,users.username FROM comment LEFT JOIN users ON (comment.userID = users.id) WHERE venueID=?", [venueId], function(err, rows, fields){
			if(!err){
				var comments = [];
				for(var i=0; i<rows.length; i++){
					var comment = {
						id: rows[i].id,
						userID: rows[i].userID,
						author: rows[i].username,
						//venue: rows[i].venueID,
						//photo: rows[i].photoID,
						text: rows[i].text
						//timestamp: rows[i].timestamp
					}
					comments.push(comment);
				}
				callback(comments);
				return;
			} else {
				console.log("Error querying DB for venue comments");
			}
			callback(null);
		});
	};
	
	that.getCommentsByUser = function(userId, callback){
		database.connection.query("SELECT * FROM comment WHERE userID=?", [userId], function(err, rows, fields){
			if(!err){
				var comments = [];
				for(var i=0; i<rows.length; i++){
					var comment = {
						id: rows[i].id,
						user: rows[i].userID,
						venue: rows[i].venueID,
						photo: rows[i].photoID,
						text: rows[i].text,
						timestamp: rows[i].timestamp
					}
					comments.push(comment);
				}
				callback(comments);
				return;
			} else {
				console.log("Error querying DB for user comments");
			}
			callback(null);
		});
	};
	
	that.saveComment = function(comment, callback){
		database.connection.query("INSERT INTO comment SET userID=?, venueID=?, photoID=?, text=?",
		[comment.user, comment.venue, comment.photo, comment.text], function(err, result){
			if(!err){
				comment.id = result.insertId;
				console.log("Inserted comment into DB: " + result.insertId);
				callback(comment);
			} else {
				console.log("Error trying to insert comment into database");
				callback(null);
			}
		});
	};
	
	that.deleteComment = function(id, callback){
		database.connection.query("DELETE FROM comment WHERE id=?", [id], function(err, rows, fields){
			if(!err){
				console.log("Deleted comment " + id);
				callback("OK");
				return;
			} else {
				console.log("Error deleting comment from DB");
			}
			callback(null);
		});
	};
	
	
	that.postComment = function(req, res, next){
		if(req.user && req.user.id && req.user.username){
			if(!req.body.hasOwnProperty('comment') || !req.body.hasOwnProperty('venueId')){
				res.send(500, {success: false});
			} else {
				var comment = {
					user: req.user.id,
					venue: req.body.venueId,
					text: req.body.comment,
					photo: null
				};
				
				that.saveComment(comment, function(comment){
					console.log("Comment added: id "+comment.id);
					res.send(201, {success: true});
				});
			}
		} else {
			res.send(401, {success: false});
		}
		return next();
	};
}

module.exports = new commentModule();