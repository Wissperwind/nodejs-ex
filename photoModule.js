function photoModule(){
	
	
	var that = this;
	
	var fs = require('fs');
	
	//that.photoDir = process.env.OPENSHIFT_DATA_DIR; //does not work...
	that.photoDir = fs.readdirSync("");
	console.log("data folder: "+fs.readdirSync("/data"));
}

module.exports = new photoModule();