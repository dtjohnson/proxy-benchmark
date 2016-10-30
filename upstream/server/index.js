"use strict";

const cluster = require('cluster');
const http = require('http');
const os = require('os');
const url = require("url");
const randomstring = require("randomstring");

process.on('SIGINT', () => process.exit(1));
process.on('SIGTERM', () => process.exit(1));

if (cluster.isMaster) {
    const numCPUs = os.cpus().length;
    for (let i = 0; i < numCPUs; i++) {
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
    const u = url.parse(req.url, true);

    if (u.pathname === "/health-check") {
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("OK");
    } else {
        let delay = 0;
        if (u.query && u.query.delay) {
            delay = parseInt(u.query.delay);
        }

        setTimeout(() => {
            const size = u.pathname.substr(1);
            if (msgs[size]) {
                res.writeHead(200, { "Content-Type": "text/plain" });
                res.end(msgs[size]);
            } else {
                res.writeHead(400, { "Content-Type": "text/plain" });
                res.end("Invalid message size");
            }
        }, delay);
    }
}).listen(80);

console.log("Upstream listening on port 80...");
