"use strict";

const cluster = require('cluster');
const http = require('http');
const os = require('os');

process.on('SIGINT', () => process.exit(1));
process.on('SIGTERM', () => process.exit(1));

if (!process.env.UPSTREAM_HOST) {
    console.error("You must set the UPSTREAM_HOST environmental variable");
    process.exit(1);
}

if (!process.env.UPSTREAM_PORT) {
    console.error("You must set the UPSTREAM_PORT environmental variable");
    process.exit(1);
}

const numCPUs = os.cpus().length;
const keepAliveAgent = new http.Agent({ keepAlive: true });

if (cluster.isMaster) {
    for (var i = 0; i < numCPUs; i++) {
        cluster.fork();
    }
} else {
    http.createServer((req, res) => {
        const proxyReq = http.request({
            method: req.method,
            path: req.url,
            headers: req.headers,
            hostname: process.env.UPSTREAM_HOST,
            port: process.env.UPSTREAM_PORT,
            agent: keepAliveAgent
        }, proxyRes => {
            res.writeHead(proxyRes.statusCode, proxyRes.headers);
            proxyRes.pipe(res);
        });

        req.pipe(proxyReq);

        proxyReq.on("error", e => {
            res.write(e.message);
            res.end();
        });

        req.on("error", e => {
            proxyReq.abort();
            res.write(e.message);
            res.end();
        });

        req.on('aborted', function () {
            proxyReq.abort();
        });
    }).listen(8080);

    console.log("node listening on port 8080...");
}

