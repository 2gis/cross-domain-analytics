var fs      = require('fs'),
    config  = require('./config'),
    ur      = require('url'),
    request = require('request'),
    express = require('express'),
    cors = require('cors'),
    logger = require('./logger'),
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

// Работает только с IP V4
function anonymizeIP(ip) {
    var ipV4Parts = ip.split('.');
    var ipV6Parts = ip.split(':');

    if (ipV4Parts.length === 4) {
        ipV4Parts[3] = '0';
        return ipV4Parts.join('.');
    }

    if (ipV6Parts.length > 1) {
        ipV6Parts[ipV6Parts.length - 1] = '';

        return ipV6Parts.join(':');
    }

    // Пришло что-то невалидное — отправим как есть
    return ip;
}

app.use(cors());
app.use(express.cookieParser());
app.use(app.router);

app.get('*', function (req, res) {
    var referal = req.headers.referer || '',
        user_agent = req.headers['user-agent'] || '',
        params = {
            // Обязательный параметр для pageview
            dl: referal,

            v: config.apiVersion,
            t: 'pageview',
            ua: user_agent,

            uip: anonymizeIP(req.ip)
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
                'User-Agent': user_agent
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
    logger.info('Server listening on port 8888');
}).on('error', function (error) {
    logger.error(error.message, error.stack);
});

process.on('uncaughtException', function (error) {
    logger.error(error.message, error.stack);
});
