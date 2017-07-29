var restify = require('restify');
var plugins = require('restify-plugins');
var database = require('./database');
var venueModule = require('./venueModule');
var userModule = require('./userModule');
var commentModule = require('./commentModule');
var photoModule = require('./photoModule');
var highscoreModule = require('./highscoreModule');

const port = 8080;

server = restify.createServer({
	name: 'IPTKServerTeamUniform',
});
//server.listen(port)


server.use(plugins.bodyParser());
server.use(plugins.queryParser({mapParams: true}));

server.on('uncaughtException', function (req, res, route, err) {
    console.log('uncaughtException', err.stack);
});

var authModule = require('./authModule');

/* server.use(function(req, res, next){
	console.log("-----Incoming request:");
	console.log("-Full request:\n", req);
	console.log("-Headers:\n", req.headers);
	console.log("-Passport:\n", req["_passport"]);
	console.log("-User Object:\n", req.user);
	console.log("-Session Object:\n", req.session);
	return next();
}); */

server.post('/signup', userModule.signUp);
server.post({url:'/login'}, authModule.logIn);
//use authModule.ensureAuthenticated() for each request requiring authentication
// in order to return the error when user is not authenticated
server.get({url:'/hello'}, authModule.ensureAuthenticated, authModule.helloRoute);
server.get({url:'/logout'}, authModule.ensureAuthenticated, function (req, res, next) {
    req.session.destroy();
    res.json({
        "error": 'false'
    });
    return next();
});
server.get({url:'/account'}, authModule.ensureAuthenticated, userModule.getUserInfo);
server.put({url:'/account'}, authModule.ensureAuthenticated, userModule.updateUserInfo);
server.del({url:'/account'}, authModule.ensureAuthenticated, userModule.deleteUser);
server.post({url:'/account/profilepicture'}, authModule.ensureAuthenticated, photoModule.postPhotoUser);
server.get({url:'/pwreset'}, authModule.ensureAuthenticated, userModule.getPasswordResetToken); //For logged out users
server.put({url:'/pwreset'}, authModule.ensureAuthenticated, userModule.updatePassword); //For logged out users
server.get({url:'/pw'}, userModule.getPasswordResetToken); //For logged in users
server.put({url:'/pw'}, userModule.updatePassword); //For logged in users

server.get({url:'/highscorelist'}, highscoreModule.getList);


// should we reconsider the URLs? maybe:
// /users
// /venues
// /venues/<venueID>/comments/<userID>
// /venues/<venueID>/ratings/<userID>
// ...



//server.get('venues/position/:latlng',	venueModule.getVenues); // deprecated; latlng should be "lat,lng", split did not work with #
//server.get('venues',					venueModule.getVenues); // expected: venues?lat=<...>&lng=<...> or venues?city=...
server.get('venues',		venueModule.getVenues); //expected object keys: lat:..., lng:... | city:...
server.get('venues/:id',	venueModule.getVenue);

server.post('checkin',	venueModule.checkIn);

//server.post('venueRatings',		venueModule.rateVenue);
//server.get('venueRatings',	venueModule.getRatingForUser);
server.get('venues/:id/ratings',venueModule.getRatingForUser);

server.post('comments',		commentModule.postComment); //comment:..., venueid:...
server.put('comments/:id',	commentModule.rateComment);
server.del('comments/:id',	commentModule.delComment);

server.post('venues/:id/photos',	photoModule.postPhotoVenue);
server.get('photos/:id',			photoModule.getPhoto);

server.put('location',	userModule.putPosition);

//server.post('commentRatings',	commentModule.rateComment); //comment:..., rating:... (-1 or +1)
//server.put('commentRatings/:id',commentModule.rateComment);

/* server.listen(3000, function(){
    console.log('%s is listening at %s', server.name, server.url);
}); */

server.listen(port, function(){
	console.log('%s is listening at %s', server.name, server.url);
	//console.log('Photos are in %s', photoModule.photoDir);
	//console.log(process.env);
	database.connect();
});