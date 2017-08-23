function cityModule(){
	
	var that = this;
	
	var database = require('./database');
	
	
	/**
	* Inserts a new city into the database and executes the callback function on the city name and id
	*/
	that.addCity = function(name, callback){
		database.connection.query("INSERT INTO cities SET name=?", [name], function(err, result){
			if(!err) {
				console.log("Inserted city " + name + " into DB with id: " + result.insertId);
				var city = {};
				city.id = result.insertId;
				city.name = name;
				callback(city);
			} else {
				console.log("Error trying to insert city into database");
				console.log(err);
				callback(null);
			}
		});
	};
	
	/**
	* Retrieves the id of a city name from the database and executes the callback function on it
	*/
	that.getCityID = function(name, callback){
		console.log("Getting ID for city: "+name);
		database.connection.query("SELECT * FROM cities WHERE name=?", [name], function(err, rows, fields){
			if(!err){
				for(var i=0; i<rows.length; i++){
					console.log("Found city " + name + " with ID: " + rows[i].id);
					callback(rows[i].id);
				}
				if(i == 0){
					console.log("Adding city to DB...");
					that.addCity(name, function(city){
						callback(city.id);
					});
				}
			} else {
				console.log("Could not get city ID");
				console.log(err);
			}
		});
	};
}

module.exports = new cityModule();