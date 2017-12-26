var winston = require('winston');
var config  = require('./config');

module.exports = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)(),
        new (winston.transports.File)({ filename: config.logPath })
    ]
});
