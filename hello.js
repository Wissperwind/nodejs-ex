const http = require('http');
const port = 8080;
var onRequest = function(req, res){
  console.log(req.method+': '+req.url);
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.write('Hello Team Uniform!');
  res.end();
}
http.createServer(onRequest).listen(port);
console.log('Server listening on port '+ port);