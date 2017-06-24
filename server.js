var restify = require('restify');
var database = require('./database');
var venueModule = require('./venueModule');
var userModule = require('./userModule');
var commentModule = require('./commentModule');
//var photoModule = require('./photoModule');

const port = 8080;

server = restify.createServer({
	name: 'IPTKServerTeamUniform',
});
//server.listen(port)

server.use(restify.bodyParser());
server.use(restify.queryParser());

server.on('uncaughtException', function (req, res, route, err) {
    console.log('uncaughtException', err.stack);
});

var loginModule = require('./loginModule');

server.post('/signup', loginModule.signUp);

server.post({url:'/login'}, loginModule.loginRoute);
server.get({url:'/hello'}, loginModule.helloRoute);


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

server.post('venueRatings',		venueModule.rateVenue);
//server.get('venueRatings',	venueModule.getRatingForUser);
server.get('venues/:id/ratings',venueModule.getRatingForUser);

server.post('comments',		commentModule.postComment); //comment:..., venueid:...
server.put('comments/:id',	commentModule.rateComment);
server.del('comments/:id',	commentModule.delComment);

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