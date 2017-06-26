function loginModule() {
    
	var that = this;
	
	var passport        = require('passport');
	var LocalStrategy   = require('passport-local').Strategy;
	var sessions        = require("client-sessions");

	var database = require('./database');
	var userModule = require('./userModule');

    that.signUp = function (req, res, next){
        if( !req.body.hasOwnProperty('username') || !req.body.hasOwnProperty('email') || !req.body.hasOwnProperty('password')){
            res.send(500, 'Insufficient Parameters')
        } else {
            user = {
                username: req.body.username,
                email: req.body.email,
                password: req.body.password
            }
            userModule.createUser(user, function (response) {
                res.send(200, response);
            });
        }
        return next();
    }


    server.use(sessions({
        // cookie name dictates the key name added to the request object
        cookieName: 'session',
        // should be a large unguessable string
        secret: 'TkipIsTheBest',
        // how long the session will stay valid in ms
        duration: 5 * 86400 * 1000    // 5 days
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
        //console.log(id)
        // Look the user up in the database and return the user object
        // For this demo, return a static user
        //return done(null, id);
    });



    passport.use(new LocalStrategy({ usernameField: 'username', session: true }, userModule.lookupUser));





// POST /login
    that.loginRoute = function(req, res, next) {

        // The local login strategy
        passport.authenticate('local', function(err, user) {
            if (err) {
                return next(err);
            }

            // Technically, the user should exist at this point, but if not, check
            if(!user) {
                //only one of the following should be the response
                res.json({"authenticated" : false, "cookie": ''});
                //return next(new restify.InvalidCredentialsError("Please check your details and try again."));
                return next();
            }

            // Log the user in!
            req.logIn(user, function(err) {
                if (err) {
                    return next(err);
                }
                req.session.user_id = req.user.id;

                if(user.username) {
                    //res.json({ success: 'Welcome ' + user.username + "!"});
                    res.json({"authenticated" : true, "cookie": ''});
                    return next();
                }
                res.json({ success: 'Welcome!'});
                return next();
            });
        })(req, res, next);
    };


// GET /hello
    that.helloRoute =function(req, res, next) {

        console.log(req["_passport"]);
        console.log(req['headers']);

        console.log(req.isAuthenticated());
        if(req.user) {
            res.send("Hello " + req.user.username);
        } else {
            res.send("Hello unauthenticated user");
        }

        return next();
    };


    // that.logIn = function (req, res, next){
    //     if( !req.body.hasOwnProperty('username') || !req.body.hasOwnProperty('email') || !req.body.hasOwnProperty('password')){
    //         res.send(500, 'Insufficient Parameters')
    //     } else {
    //
    //         user = {
    //             username: req.body.username,
    //             email: req.body.email,
    //             password: req.body.password
    //         }
    //         userModule.authenticateUser(user, function (response) {
    //             res.send(200, response);
    //         });
    //
    //
    //     }
    //     return next();
    // }
}

module.exports = new loginModule();