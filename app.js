var http    = require('http');
var Cookies = require('cookies');
var fs      = require('fs');
var qs      = require('querystring');
var config  = require('./config.json');
var request = require('request');

var urls = config.projects.map(function (project) {
  return project.image;
});

var projects = config.projects.reduce(function (obj, project) {
  obj[project.image] = {
    cookie: 'cid_' + project.projectPreffix,
    image: fs.readFileSync('./' + project.image),
    UA: project.UA,
  };
  return obj;
}, {});

server = http.createServer(function (req, res) {
  var cookies = new Cookies(req, res),
      referal = req.headers['referer'] || '',
      user_agent = req.headers['user-agent'] || '',
      params = {
        ap: config.projectPreffix,
        dp: '/',
        dh: referal,
        v: config.apiVersion,
        t: 'pageview'
      },
      ip = req.headers['x-forwarded-for'] ||
           req.connection.remoteAddress ||
           req.socket.remoteAddress ||
           req.connection.socket.remoteAddress,
      url = require('url').parse(req.url,true).pathname.substring(1),
      clientid;

  if (urls.indexOf(url) > -1) {

    clientid = cookies.get(projects[url].cookie);

    if (!clientid) {
      clientid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
          return v.toString(16);
      });

      cookies.set(projects[url].cookie, clientid, {httpOnly: false});
    }

    params.tid = projects[url].UA;
    params.cid = clientid;

    var path = config.hostname + config.path + '?' + qs.stringify(params);

    request.post(path, {
      headers: {
        'User-Agent': user_agent,
        'IP Address': ip
      }
    });

    res.writeHead(200, {'Content-Type': 'image/png' });
    res.end(projects[url].image, 'binary');

  } else {
    res.end();
  }

}).listen(8888);

console.log('Server has started.');