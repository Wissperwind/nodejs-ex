function photoModule(){
	
	
	var that = this;
	
	var fs = require('fs');
	
	//that.photoDir = process.env.OPENSHIFT_DATA_DIR; //does not work...
	that.photoDir = process.env.PWD.replace("src", "data");
	console.log(photoDir);
	console.log("data folder exists: "+fs.existsSync(photoDir));
}

module.exports = new photoModule();