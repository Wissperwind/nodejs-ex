function authModule() {
	var that            = this;

    var passport        = require('passport');
    var LocalStrategy   = require('passport-local').Strategy;
    var sessions        = require("client-sessions");

    var database = require('./database');
    var userModule = require('./userModule');
    var encryptUtils = require('./encryptUtils');

    // Lookup a user in database
    var lookupUser = function(username, password, done) {

        var query = 'SELECT * FROM users WHERE username = ?';
        database.connection.query(query, [username], function (error, results, fields) {
            if (!error){
                if( results.length != 0 ){
                    if( encryptUtils.isPasswordCorrect(results[0].passworthash, results[0].salt, password) ){
                        return done(null, {id:results[0].id, username:username});
                    } else {
                        return done(null, false, { error: 'Incorrect password.' });
                    }
                } else {
                    return done(null, false, { error: 'Incorrect username' });
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
        cookieName: 'session',
        secret: 'TkipIsTheBest',
        duration: 5 * 86400 * 1000    // 5 days
    }));

    // Initialize passport
    server.use(passport.initialize());
    // Set up the passport session
    server.use(passport.session());

    // passport.serializeUser(function(user, done) {
    //     done(null, user);
    // });
    //
    // passport.deserializeUser(function(id, done) {
    //     //console.log(id)
    //     // Look the user up in the database and return the user object
    //     return done(null, id);
    // });
    
    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });

    passport.deserializeUser(function(id, done) {
        userModule.findUser(id, function(user){
            done(null, user);
        });
    });


    // POST /login
    that.logIn = function(req, res, next) {

        // The local login strategy
        passport.authenticate('local', function(err, user, info) {
            if (err) {
                return next(err);
            }

            if(!user) {
                res.json({"error" : info.error});
                return next();
            }

            // Log the user in!
            req.logIn(user, function(err) {
                if (err) {
                    return next(err);
                }
                req.session.user_id = req.user.id;

                if(user.username) {
                    res.json({"error" : "false"});
                    return next();
                }
                return next();
            });
        })(req, res, next);
    };


    // GET /hello
    that.helloRoute = function(req, res, next) {

        //console.log(req);
        // console.log(req["_passport"]);
        // console.log(req['headers']);

        console.log(req.isAuthenticated());
        console.log(req.user)
        if(req.user) {
            console.log(req.user)
            res.send("Hello " + req.user.username);
        } else {
            res.send("Hello unauthenticated user");
        }

        return next();
    };

    that.ensureAuthenticated = function (req, res, next) {
        if (req.isAuthenticated()){ console.log('yes is authenticated')
            return next();
        } else { console.log('no not authenticated')
            res.json({"error" : "Unauthenticated user"});
        }
    }

}

module.exports = new authModule();