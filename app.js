var fs      = require('fs'),
    qs      = require('querystring'),
    config  = require('./config.json'),
    ur      = require('url'),
    request = require('request'),
    express = require('express'),
    cors = require('cors'),
    app = express(),

    urls = config.projects.map(function (project) {
        return project.image;
    }),

    projects = config.projects.reduce(function (obj, project) {
        obj[project.image] = {
            cookie: 'cid_' + project.projectPreffix,
            image: fs.readFileSync('./' + project.image),
            UA: project.UA
        };
        return obj;
    }, {});


app.use(cors());
app.use(express.cookieParser());
app.use(app.router);

app.get('*', function (req, res) {
    var referal = req.headers.referer || '',
        user_agent = req.headers['user-agent'] || '',
        params = {
            ap: config.projectPreffix,
            dl: referal,
            v: config.apiVersion,
            t: 'pageview'
        },
        url = ur.parse(req.url, true).pathname.substring(1),
        clientid;

    if (urls.indexOf(url) > -1) {
        clientid = req.cookies[projects[url].cookie];

        if (!clientid) {
            clientid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
                return v.toString(16);
            });

            res.cookie(projects[url].cookie, clientid, {httpOnly: false});
        }

        params.tid = projects[url].UA;
        params.cid = clientid;
        if (req.query.sr) params.sr = req.query.sr;

        var path = config.hostname + config.path;

        request.post(path, {
            headers: {
                'User-Agent': user_agent,
                'IP Address': req.ip
            },
            qs: params
        });

        res.writeHead(200, {'Content-Type': 'image/png' });
        res.end(projects[url].image, 'binary');

    } else {
        res.end();
    }
});

app.listen(8888, function () {
    console.log('Server listening on port 8888');
});
