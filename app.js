var http    = require('http');
var Cookies = require('cookies');
var fs =      require('fs');
var ua =      require('universal-analytics');
var img = fs.readFileSync('./dg-tilelayer-base-copyright.png');

server = http.createServer( function(req, res) {
  var cookies = new Cookies(req, res),
      clientid,
      referal = req.headers['referer'] || '';

  if ( req.url == '/dg-tilelayer-base-copyright.png' ) {
    clientid = cookies.get('clientid');
    if (!clientid) {
      clientid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
          return v.toString(16);
      });
      cookies.set('clientid', clientid, {httpOnly: false});
    }
    var visitor = ua('UA-13117927-2', clientid);

    visitor.pageview('/', referal).send();

    res.writeHead(200, {'Content-Type': 'image/png' });
    res.end(img, 'binary');
  }
}).listen(8888);

console.log('Server has started.');