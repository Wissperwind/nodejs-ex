function photoModule(){
	
	
	var that = this;
	
	var fs = require('fs');
	
	//that.photoDir = process.env.OPENSHIFT_DATA_DIR; //does not work...
	that.photoDir = fs.existsSync("");
	console.log("data folder: "+fs.existsSync("/data"));
}

module.exports = new photoModule();