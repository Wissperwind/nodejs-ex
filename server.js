var restify = require('restify');
var plugins = require('restify-plugins');
var database = require('./database');
var venueModule = require('./venueModule');
var userModule = require('./userModule');
var friendModule = require('./friendModule');
var commentModule = require('./commentModule');
var photoModule = require('./photoModule');
var chat = require('./chatModule');
var highscoreModule = require('./highscoreModule');
var notificationModule = require('./notificationModule');

const port = 8080;

server = restify.createServer({
	name: 'IPTKServerTeamUniform',
});

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
server.post('/signup/:username/:email/:password', userModule.signUp);
server.post({url:'/login'}, authModule.logIn);
server.post({url:'/login/:username/:password'}, authModule.logIn);
//use authModule.ensureAuthenticated() for each request requiring authentication
// in order to return the error when user is not authenticated
server.get({url:'/logout'}, authModule.ensureAuthenticated, function (req, res, next) {
    req.session.destroy();
    res.json({
        "error": 'false'
    });
    return next();
});

server.get({url:'/account'}, authModule.ensureAuthenticated, userModule.getUserInfo);
server.put({url:'/account'}, authModule.ensureAuthenticated, userModule.updateUserInfo);
server.put({url:'/account/:username/:realname/:email/:age/:city'}, authModule.ensureAuthenticated, userModule.updateUserInfo);
server.del({url:'/account'}, authModule.ensureAuthenticated, userModule.deleteUser);

server.put({url:'/friends'},authModule.ensureAuthenticated, friendModule.postfriend);
server.get({url:'/friends'},authModule.ensureAuthenticated, friendModule.getUserfriend);
server.del({url:'/friends/:friendid'},authModule.ensureAuthenticated, friendModule.deleteUser);
server.get({url:'/friendprofile'},authModule.ensureAuthenticated, friendModule.getFriendInfo);
server.get('/profilesearch',authModule.ensureAuthenticated, friendModule.profileSearch);
server.get('/profilesearchlocation',authModule.ensureAuthenticated, friendModule.profileSearchByLocation);


server.post({url:'/chat'}, authModule.ensureAuthenticated,chat.postchat);
//server.get({url:'/chat/:friendid'},authModule.ensureAuthenticated, chat.getchat);
server.get({url:'/chat'},authModule.ensureAuthenticated, chat.getchat);

server.post({url:'/account/profilepicture'}, authModule.ensureAuthenticated, photoModule.postPhotoUser);

server.get({url:'/pwreset'}, authModule.ensureAuthenticated, userModule.getPasswordResetToken); //For logged in users
server.put({url:'/pwreset'}, authModule.ensureAuthenticated, userModule.updatePassword); //For logged in users
server.put({url:'/pwreset/:newpassword/:safetystring'}, authModule.ensureAuthenticated, userModule.updatePassword); //For logged in users
server.get({url:'/pw'}, userModule.getPasswordResetToken); //For logged out users
server.get({url:'/pw/:username'}, userModule.getPasswordResetToken); //For logged out users
server.put({url:'/pw'}, userModule.updatePassword); //For logged out users
server.put({url:'/pw/:username/:newpassword/:safetystring'}, userModule.updatePassword); //For logged out users

server.get({url:'/highscorelist'}, highscoreModule.getList);
server.get({url:'/notification'}, notificationModule.getNotifications);

server.get('venues',		venueModule.getVenues);
server.get('venues/:id',	venueModule.getVenue);

server.post('checkin',	venueModule.checkIn);

server.get('venues/:id/ratings',venueModule.getRatingForUser);

server.post('comments',		commentModule.postComment); //comment:..., venueid:...
server.put('comments/:id',	commentModule.rateComment);
server.del('comments/:id',	commentModule.delComment);

server.post('venues/:id/photos',	photoModule.postPhotoVenue);
server.get('photos/:id',			photoModule.getPhoto);

server.put('location', authModule.ensureAuthenticated, userModule.putPosition);
server.put('location/:lat/:lng', authModule.ensureAuthenticated, userModule.putPosition);

server.listen(port, function(){
	console.log('%s is listening at %s', server.name, server.url);
	database.connect();
});
