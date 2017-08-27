function encryptUtils(){
    var that            = this;
    var crypto          = require('crypto');
    const iterations    = 100000;
    const keylen        = 16;

    /**
     * Returns randomly generated salt string and hashes the password using pbkdf2 alogorithm
     * @param password
     * @returns {{salt: string, hash: string}}
     */
    that.hashPassword = function(password) {
        var salt = crypto.randomBytes(256).toString('base64').slice(0,5);
        var hash = crypto.pbkdf2Sync(password, salt, iterations, keylen, 'sha512').toString('hex');
        return {
            salt: salt,
            hash: hash
        };
    };

    /**
     * Checks if a submitted password matches the hashed password existing in database
     * @param savedHash
     * @param savedSalt
     * @param passwordAttempt
     * @returns {boolean}
     */
    that.isPasswordCorrect = function(savedHash, savedSalt, passwordAttempt) {
        return savedHash == crypto.pbkdf2Sync(passwordAttempt, savedSalt, iterations, keylen, 'sha512').toString('hex');
    }
}
module.exports = new encryptUtils();