"use strict";

const cluster = require('cluster');
const http = require('http');
const https = require('https');
const os = require('os');
const fs = require('fs');
const httpProxy = require('http-proxy');
const connect = require("connect");
const compression = require("compression");

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

const sslOptions = {
    key: fs.readFileSync(`${__dirname}/key.pem`),
    cert: fs.readFileSync(`${__dirname}/cert.pem`)
};

const numCPUs = os.cpus().length;
if (cluster.isMaster) {
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }
} else {
    const agent = new http.Agent({ keepAlive: true });
    const target = `http://${process.env.UPSTREAM_HOST}:${process.env.UPSTREAM_PORT}`;
    const proxy = httpProxy.createProxy({ agent });
    const app = connect();
    app.use(compression({ level: 1 }));
    app.use((req, res) => {
        proxy.web(req, res, { target });
    });

    http.createServer(app).listen(80);
    https.createServer(sslOptions, app).listen(443);

    console.log("node-http-proxy listening on port 80 and 443...");
}
