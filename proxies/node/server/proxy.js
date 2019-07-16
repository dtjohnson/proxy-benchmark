"use strict";

const http = require('http');
const zlib = require('zlib');

const stripHeaders = {};
[
    // From RFC 2616 section 13.5.1
    "Connection",
    "Keep-Alive",
    "Proxy-Authenticate",
    "Proxy-Authorization",
    "TE",
    "Trailers",
    "Transfer-Encoding",
    "Upgrade",

    // We don't want to trigger upstream HTTPS redirect
    "Upgrade-Insecure-Requests"
].forEach(header => {
    // Save in object as standard form and lower case. We'll check standard form first and resort to lower case comparison if needed.
    stripHeaders[header] = true;
    stripHeaders[header.toLowerCase()] = true;
});

// N.B. It's OK for the moment to pass along the accept-encoding header as this proxy doesn't
// modify the content at all.

module.exports = opts => {
    const agent = new http.Agent({ keepAlive: true });

    return (req, res) => {
        let useGzip = false;
        const proxyReq = http.request({
            method: req.method,
            path: req.url,
            hostname: opts.upstreamHost,
            port: opts.upstreamPort,
            agent
        }, proxyRes => {
            // Strip response headers that shouldn't be send to the client.
            for (let i = 0; i < proxyRes.rawHeaders.length; i += 2) {
                const name = proxyRes.rawHeaders[i];
                if (stripHeaders[name] || stripHeaders[name.toLowerCase()]) continue;
                const value = proxyRes.rawHeaders[i + 1];
                res.setHeader(name, value);
            }

            if (useGzip) {
                const gzip = zlib.createGzip({
                    level: 1
                });

                res.setHeader("Content-Encoding", "gzip");

                res.writeHead(proxyRes.statusCode);
                proxyRes.pipe(gzip).pipe(res);
            } else {
                res.writeHead(proxyRes.statusCode);
                proxyRes.pipe(res);
            }
        });

        // Strip request headers that shouldn't be sent upstream.
        for (let i = 0; i < req.rawHeaders.length; i += 2) {
            const name = req.rawHeaders[i];
            const value = req.rawHeaders[i + 1];

            if (name === "Accept-Encoding" || name.toLowerCase() === "accept-encoding") {
                if (value === "gzip" || value.indexOf("gzip") >= 0) useGzip = true;

                // TODO: Properly support other forms:
                //     Accept-Encoding: gzip, compress, br
                //     Accept-Encoding: br;q=1.0, gzip;q=0.8, *;q=0.1
            }

            if (stripHeaders[name] || stripHeaders[name.toLowerCase()]) continue;

            proxyReq.setHeader(name, value);
        }

        req.pipe(proxyReq);

        // Handle any proxy request errors by sending a 502.
        proxyReq.on("error", e => {
            res.writeHead(502);
            res.end(e.message);
        });

        // Handle any request errors by returning a 400.
        req.on("error", e => {
            proxyReq.abort();
            res.writeHead(400);
            res.end(e.message);
        });

        // If this request is aborted, abort a request to the upstream.
        req.on('aborted', () => {
            proxyReq.abort();
        });
    };
};
