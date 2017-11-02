var winston = require('winston');

var logPath = process.env.NODE_ENV === 'development' ? 'app.log' : '/var/log/cross-domain-analytics.log';

module.exports = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)(),
        new (winston.transports.File)({ filename: logPath })
    ]
});
