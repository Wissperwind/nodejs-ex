function commentModule(){
	
	var that = this;
	
	var database = require('./database');
	
	
	that.findComment = function(id, callback){
		database.connection.query("SELECT *,FROM_UNIXTIME(UNIX_TIMESTAMP(comment.timestamp),'%d %b %Y') AS time FROM comment WHERE id=?", [id], function(err, rows, fields){
			if(!err){
				for(var i=0; i<rows.length; i++){
					var comment = {
						id: rows[i].id,
						user: rows[i].userID,
						venue: rows[i].venueID,
						photo: rows[i].photoID,
						text: rows[i].text,
						time: rows[i].time
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
	
	that.findCommentsByVenue = function(venueId, callback){
		database.connection.query("SELECT comment.*,users.username,FROM_UNIXTIME(UNIX_TIMESTAMP(comment.timestamp),'%d %b %Y') AS time FROM comment LEFT JOIN users ON (comment.userID = users.id) WHERE venueID=?", [venueId], function(err, rows, fields){
			if(!err){
				var comments = [];
				for(var i=0; i<rows.length; i++){
					var comment = {
						id: rows[i].id,
						userID: rows[i].userID,
						author: rows[i].username,
						//venue: rows[i].venueID,
						//photo: rows[i].photoID,
						text: rows[i].text,
						score: rows[i].score,
						time: rows[i].time
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
	
	that.findCommentsByUser = function(userId, callback){
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
	
	that.updateCommentRating = function(id, rating, callback){
		database.connection.query("UPDATE comment SET score=? WHERE id=?", [rating, id], function(err, result){
			if(!err){
				console.log("Updated comment: " + id);
				callback(id);
			} else {
				console.log("Error updating comment score");
				callback(null);
			}
		});
	};
	
	that.removeComment = function(id, callback){
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
	
	
	
	that.getScoreForComment = function(id, callback){
		database.connection.query("SELECT SUM(rating) AS score FROM comment_rating WHERE comment=?", [id], function(err, rows, fields){
			if(!err){
				for(var i=0; i<rows.length; i++){
					console.log("Score for comment " + id + " is " + rows[i].score);
					callback(rows[i].score);
					return;
				}
			} else {
				console.log("Error querying DB for comment score");
			}
			callback(null);
		});
	};
	
	that.findRating = function(comment, user, callback){
		database.connection.query("SELECT * FROM comment_rating WHERE comment=? AND user=?", [comment, user], function(err, rows, fields){
			if(!err){
				for(var i=0; i<rows.length; i++){
					var rating = {
						user: rows[i].user,
						comment: rows[i].comment,
						rating: rows[i].rating,
						timestamp: rows[i].timestamp
					}
					callback(rating);
					return;
				}
			} else {
				console.log("Error querying DB for comment rating");
			}
			callback(null);
		});
	};
	
	that.insertRating = function(rating, callback){
		database.connection.query("INSERT INTO comment_rating SET comment=?, rating=?, user=?",
		[rating.comment, rating.rating, rating.user], function(err, result){
			if(!err){
				console.log("Inserted comment rating into DB");
				callback(rating);
			} else {
				console.log("Error trying to insert comment rating into database");
				callback(null);
			}
		});
	};
	
	that.updateRating = function(rating, callback){
		database.connection.query("UPDATE comment_rating SET rating=? WHERE comment=? AND user=?",
		[rating.rating, rating.comment, rating.user], function(err, result){
			if(!err){
				console.log("Updated comment rating");
				callback(rating);
			} else {
				console.log("Error updating comment rating");
				callback(null);
			}
		});
	};
	
	that.removeRating = function(comment, user, callback){
		database.connection.query("DELETE FROM comment_rating WHERE comment=? AND user=?", [comment, user], function(err, rows, fields){
			if(!err){
				console.log("Deleted comment rating");
				callback("OK");
				return;
			} else {
				console.log("Error deleting comment rating from DB");
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
	
	that.delComment = function(req, res, next){
		if(req.user && req.user.id){
			that.findComment(req.params.id, function(comment){
				if(!comment){
					res.send(404, {success: false});
				} else {
					if(comment.user == req.user.id){
						that.removeComment(req.params.id, function(result){
							if(!result){
								res.send(404, {success: false});
							} else {
								res.send(200, {success: true});
							}
						});
					} else {
						res.send(401, {success: false});
					}
				}
			});
		} else {
			res.send(401, {success: false});
		}
		return next();
	};
	
	that.rateComment = function(req, res, next){
		if(req.user && req.user.id){
			that.findRating(req.params.id, req.user.id, function(rating){
				if(!rating){
					that.insertRating({comment: req.params.id, rating: req.params.rating, user: req.user.id}, function(rating){
						that.getScoreForComment(req.params.id, function(score){
							that.updateCommentRating(req.params.id, score, function(comment){
								if(!comment){
									res.send(404, {success: false});
								} else {
									res.send(200, {success: true});
								}
							});
						});
					});
				} else {
					that.updateRating({comment: req.params.id, rating: req.params.rating, user: req.user.id}, function(rating){
						that.getScoreForComment(req.params.id, function(score){
							that.updateCommentRating(req.params.id, score, function(comment){
								if(!comment){
									res.send(404, {success: false});
								} else {
									res.send(200, {success: true});
								}
							});
						});
					});
				}
			});
		} else {
			res.send(401, {success: false});
		}
		return next();
	};
}

module.exports = new commentModule();