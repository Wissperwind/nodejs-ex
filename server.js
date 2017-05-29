restify = require('restify');


const port = 8080;

server = restify.createServer();
server.listen(port);
server.use(restify.bodyParser());
server.use(restify.queryParser());
server.on('uncaughtException', function (req, res, route, err) {
    console.log('uncaughtException', err.stack);
});

var login = require('./login');

server.post('/signup', login.signUp);

server.post({url:'/login'}, login.loginRoute);
server.get({url:'/hello'}, login.helloRoute);





server.listen(3000, function(){
    console.log('%s is listening at %s', server.name, server.url);
});