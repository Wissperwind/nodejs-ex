var mysql = require('mysql');


const http = require('http');
const port = 8080;
var onRequest = function(req, res){
  console.log(req.method+': '+req.url);
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.write('Hello Team Uniform!');
  res.end();
  
  dbConnection();
  
}
http.createServer(onRequest).listen(port);
console.log('Server listening on port '+ port)




function dbConnection() {
	
	
	console.log('in db function');
	
	
	that = this;
	
	var connection = mysql.createConnection({
			'host' 		: 'sql11.freemysqlhosting.net',
			'user'		: 'sql11175021',
			'password'	: 'fXIz3dRIpx',
			'database'	: 'sql11175021'		
		});	
	connection.connect( function(err) {
		if(err) console.log('Error connecting to db: '+err);
	});
		
	/* Loads the student list from the database table */
	that.retrieveStudents = function(callback) {
		console.log("Retrieving Student list...");
		that.students = [];
		connection.query("SELECT * FROM users", 
						 function(err, rows, fields) {
			if(!err) {
				students = []
				for(i=0; i<rows.length; i++) {
					console.log(rows[i].id+' '+rows[i].username);
					student = {
						id : rows[i].id,
						name : rows[i].username
					}
					students.push(student);
				}
				console.log(students);
				callback(students);
			} else {
				console.log("Error querying the mysql database");
			}
			callback(null);
		});		
	}
	
	
}

module.exports = new dbConnection();
