const restify = require('restify');
const database = require('./database');

const port = 8080;

server = restify.createServer();
server.listen(port)

server.use(restify.bodyParser());
server.use(restify.queryParser());

server.on('uncaughtException', function (req, res, route, err) {
    console.log('uncaughtException', err.stack);
});

var login = require('./login');

server.post('/signup', login.signUp);

server.post({url:'/login'}, login.loginRoute);
server.get({url:'/hello'}, login.helloRoute);

server.get('venues/position/:latlng',	database.getVenues); // latlng should be "lat,lng", split did not work with #
server.get('venues/:id',				database.getVenue);

/* server.listen(3000, function(){
    console.log('%s is listening at %s', server.name, server.url);
}); */

server.listen(port, function(){
	console.log('%s is listening at %s', server.name, server.url);
	database.connect();
});