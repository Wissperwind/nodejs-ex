function photoModule(){
	
	
	var that = this;
	
	var fs = require('fs');
	
	//that.photoDir = process.env.OPENSHIFT_DATA_DIR; //does not work...
	that.photoDir = "../../../teamuniformdata";//+process.env.PWD;
	console.log(that.photoDir);
	console.log("data folder exists: "+fs.existsSync(that.photoDir));
}

module.exports = new photoModule();