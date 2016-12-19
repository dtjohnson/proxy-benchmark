"use strict";

const cluster = require('cluster');
const http = require('http');
const os = require('os');
const proxy = require("node-proxy-test");
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

if (!process.env.UPSTREAM_KEEP_ALIVE) {
    console.error("You must set the UPSTREAM_KEEP_ALIVE environmental variable");
    process.exit(1);
}

const numCPUs = os.cpus().length;

if (cluster.isMaster) {
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }
} else {
    const app = connect();
    app.use(compression({ level: 1 }));
    app.use(proxy({
        keepAlive: process.env.UPSTREAM_KEEP_ALIVE === "true",
        upstreamHost: process.env.UPSTREAM_HOST,
        upstreamPort: process.env.UPSTREAM_PORT
    }));

    http.createServer(app).listen(80);

    console.log("node listening on port 80...");
}
