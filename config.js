var mainConfig = require('./config.main.json');
var config;

try {
    var localConfig = require('./config.local.json');
    config = Object.assign({}, mainConfig, localConfig);
} catch (e) {
    config = Object.assign({}, mainConfig);
}

module.exports = config;
