const restify = require('restify');
const db = require('./database');

const port = 8080;

var server = restify.createServer();

server.use(restify.bodyParser());
server.use(restify.queryParser());

server.on('uncaughtException', function (req, res, route, err) {
    console.log('uncaughtException', err.stack);
});

var login = require('./login');

server.post('/signup', login.signUp);

server.post({url:'/login'}, login.loginRoute);
server.get({url:'/hello'}, login.helloRoute);

server.get('venues/position/:latlng',	db.getVenues); // latlng should be "lat,lng", split did not work with #
server.get('venues/:id',				db.getVenue);

/* server.listen(3000, function(){
    console.log('%s is listening at %s', server.name, server.url);
}); */

server.listen(port, function(){
	console.log('%s is listening at %s', server.name, server.url);
	db.connect();
});