var restify = require('restify');
var database = require('./database');
var venueModule = require('./venueModule');
var userModule = require('./userModule');

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

server.get('venues/position/:latlng',	venueModule.getVenues); // latlng should be "lat,lng", split did not work with #
server.get('venues/:id',				venueModule.getVenue);

/* server.listen(3000, function(){
    console.log('%s is listening at %s', server.name, server.url);
}); */

server.listen(port, function(){
	console.log('%s is listening at %s', server.name, server.url);
	database.connect();
});