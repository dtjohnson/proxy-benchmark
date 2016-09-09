"use strict";

const http = require('http');
const httpProxy = require('http-proxy');

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

const target = `http://${process.env.UPSTREAM_HOST}:${process.env.UPSTREAM_PORT}`;
const proxy = httpProxy.createProxy();
http.createServer((req, res) => {
    proxy.web(req, res, { target });
}).listen(80);

console.log("node-http-proxy listening on port 80...");
