function dbConnection() {
	
	var mysql = require('mysql');
	
	var that = this;
	
	that.connection = mysql.createConnection({
			'host' 		: 'sql11.freemysqlhosting.net',
			'user'		: 'sql11175021',
			'password'	: 'fXIz3dRIpx',
			'database'	: 'sql11175021'		
		});	

// for local testing
/* 	that.connection = mysql.createConnection({
			'host' 		: 'localhost',
			'user'		: 'root',
			'password'	: '',
			'database'	: 'iptk'		
		});	 */
	
	that.connect = function(){
		that.connection.connect( function(err) {
			if(err)
				console.log('Error connecting to db: '+err);
			else
				console.log('Connected to db')
		});
	};
}

module.exports = new dbConnection();