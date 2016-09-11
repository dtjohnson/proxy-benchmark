"use strict";

const cluster = require('cluster');
const http = require('http');
const os = require('os');
const randomstring = require("randomstring");

process.on('SIGINT', () => process.exit(1));
process.on('SIGTERM', () => process.exit(1));

if (cluster.isMaster) {
    const numCPUs = os.cpus().length;
    for (var i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    return;
}

console.log("Generating random messages...");
const msgs = {};
for (let i = 0; i <= 7; i++) {
    const size = Math.pow(10, i);
    msgs[size] = randomstring.generate(size);
}

console.log("Starting server...");
http.createServer((req, res) => {
    res.setHeader('Content-Type', 'text/plain');

    if (req.url === "/health-check") {
        res.statusCode = 200;
        res.end("OK");
    } else {
        const size = req.url.substr(1);
        if (msgs[size]) {
            res.statusCode = 200;
            res.end(msgs[size]);
        } else {
            res.statusCode = 400;
            res.end("Invalid message size");
        }
    }
}).listen(80);

console.log("Upstream listening on port 80...");
