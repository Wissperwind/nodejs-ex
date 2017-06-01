const restify = require('restify');
const db = require('./database');
const port = 8080;

var server = restify.createServer({
	name: 'IPTKServerTeamUniform',
});

// server.use(function(req, res, next){
	// return next();
// });

server.use(restify.bodyParser());

server.get('venues/position/:latlng',	db.getVenues); // latlng should be "lat,lng", split did not work with #
server.get('venues/:id',	db.getVenue);

server.listen(port, function(){
	console.log("Server running on port: " + port);
	db.connect();
});