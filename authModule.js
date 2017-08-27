function authModule() {
	var that            = this;

    var passport        = require('passport');
    var LocalStrategy   = require('passport-local').Strategy;
    var sessions        = require("client-sessions");

    var database = require('./database');
    var userModule = require('./userModule');
    var encryptUtils = require('./encryptUtils');

    /**
     * Lookup a user in database
     * @param {String} username
     * @param {String} password
     * @param {Function} done
     */
    var lookupUser = function(username, password, done) {

        var query = 'SELECT * FROM users WHERE username = ?';
        database.connection.query(query, [username], function (error, results, fields) {
            if (!error){
                if( results.length != 0 ){
                    if( encryptUtils.isPasswordCorrect(results[0].passworthash, results[0].salt, password) ){
                        return done(null, {id:results[0].id, username:username});
                    } else {
                        return done(null, false, { message: 'Incorrect password!' });
                    }
                } else {
                    return done(null, false, { message: 'Incorrect username!' });
                }
            } else {
                console.log('no result')
                console.log(error.code)
                response = {
                    "error": error.code
                };
            }
        });

    };
    passport.use(new LocalStrategy({ usernameField: 'username', session: true }, lookupUser));


    server.use(sessions({
        // cookie name dictates the key name added to the request object
        cookieName: 'session',
        // should be a large unguessable string
        secret: 'TkipIsTheBest',
        // how long the session will stay valid in ms
        duration: 30 * 86400 * 1000    // 30 days
    }));

    // Initialize passport
    server.use(passport.initialize());
    // Set up the passport session
    server.use(passport.session());

    // This is how a user gets serialized
    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });

    // This is how a user gets deserialized
    passport.deserializeUser(function(id, done) {
        userModule.findUser(id, function(user){
            done(null, user);
        });
    });


    // logs the user in after authenticating credentials
    that.logIn = function(req, res, next) {
        if( typeof req.body != 'object'){
            req.body = {
                'username': req.params.username,
                'password': req.params.password
            };
        }
        // The local login strategy
        passport.authenticate('local', function(err, user, info) {
            if (err) {
                return next(err);
            }

            if(!user) {
                res.send(400, {"error" : info.message});
                return next();
            }

            // Log the user in!
            req.logIn(user, function(err) {
                if (err) {
                    return next(err);
                }
                req.session.user_id = req.user.id;

                if(user.username) {
                    res.send(200, {"error" : "false"});
                    return next();
                }
                return next();
            });
        })(req, res, next);
    };

    //Sends unauthenticated error message for unauthenticated requests
    that.ensureAuthenticated = function (req, res, next) {
        if (req.isAuthenticated()){ console.log('yes is authenticated')
            return next();
        } else { console.log('no not authenticated')
            res.send(400,{"error" : "Unauthenticated user"});
        }
    }

}

module.exports = new authModule();