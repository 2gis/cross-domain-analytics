var http    = require('http');
var Cookies = require('cookies');
var fs      = require('fs');
var qs      = require('querystring');
var config  = require('./config.json');
var request = require('request');
var img = fs.readFileSync('./' + config.image);
var cookie = 'cid_' + config.projectPreffix;

server = http.createServer(function (req, res) {
  var cookies = new Cookies(req, res),
      referal = req.headers['referer'] || '',
      params = {
        dp: '/',
        dh: referal,
        v: config.apiVersion,
        tid: config.UA,
        t: 'pageview'
      },
      clientid;

  if (req.url == '/' + config.image) {

    clientid = cookies.get(cookie);

    if (!clientid) {
      clientid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
          return v.toString(16);
      });

      cookies.set(cookie, clientid, {httpOnly: false});
    }

    params.cid = clientid;

    var path = config.hostname + config.path + '?' + qs.stringify(params);

    request.post(path);

    res.writeHead(200, {'Content-Type': 'image/png' });
    res.end(img, 'binary');
  }

}).listen(8888);

console.log('Server has started.');