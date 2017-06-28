function photoModule(){
	
	
	var that = this;
	
	var fs = require('fs');
	
	//that.photoDir = process.env.OPENSHIFT_DATA_DIR; //does not work...
	that.photoDir = "../../../teamuniformdata";//+process.env.PWD;
	console.log('Photos are in %s', that.photoDir);
	console.log("This folder exists: "+fs.existsSync(that.photoDir));
}

module.exports = new photoModule();