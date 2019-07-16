"use strict";

const cluster = require('cluster');
const http = require('http');
const https = require('https');
const os = require('os');
const fs = require('fs');
const proxy = require("./proxy");

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
    const p = proxy({
        upstreamHost: process.env.UPSTREAM_HOST,
        upstreamPort: process.env.UPSTREAM_PORT
    });

    http.createServer(p).listen(80);
    https.createServer(sslOptions, p).listen(443);

    console.log("node listening on port 80 and 443...");
}
