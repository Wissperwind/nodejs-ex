function photoModule(){
	
	var that = this;
	
	that.photoDir = process.env.OPENSHIFT_DATA_DIR;
}

module.exports = new photoModule();