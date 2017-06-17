function photoModule(){
	
	console.log(fs.readdirSync("/data"));
	
	var that = this;
	
	var fs = require('fs');
	
	//that.photoDir = process.env.OPENSHIFT_DATA_DIR; //does not work...
	that.photoDir = fs.readdirSync("");
}

module.exports = new photoModule();