function encryptUtils(){
    var that            = this;
    var crypto          = require('crypto');
    const iterations    = 100000;
    const keylen        = 16;

    that.hashPassword = function(password) {
        var salt = crypto.randomBytes(256).toString('base64').slice(0,5);
        var hash = crypto.pbkdf2Sync(password, salt, iterations, keylen, 'sha512').toString('hex');
        return {
            salt: salt,
            hash: hash
        };
    };
    that.isPasswordCorrect = function(savedHash, savedSalt, passwordAttempt) {
        return savedHash == crypto.pbkdf2Sync(passwordAttempt, savedSalt, iterations, keylen, 'sha512').toString('hex');
    }
}
module.exports = new encryptUtils();