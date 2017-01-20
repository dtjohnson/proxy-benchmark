"use strict";

const execFile = require("child_process").execFile;
const outputRegex = /Latency\s+([\d.]+)(\w+)[\s\S]+Requests\/sec:\s+([\d.]+)\s+Transfer\/sec:\s+([\d.]+)(\w+)/;

const sizeUnitConversions = {
    B: 1,
    KB: 1024,
    MB: 1024 * 1024,
    GB: 1024 * 1024 * 1024
};

const timeUnitConversions = {
    us: 1 / 1000,
    ms: 1,
    s: 1000,
    m: 1000 * 60,
    h: 1000 * 60 * 60
};

module.exports = (opts, cb) => {
    const args = [
        "-d", `${opts.duration || 10}s`,
        "-c", opts.connections || 1,
        "-t", opts.threads || 1,
        "-R", opts.requestRate || 1000
    ];

    if (opts.compression) {
        args.push("-H");
        args.push("Accept-Encoding: gzip");
    }

    args.push(opts.url);

    execFile("wrk", args, (err, stdout, stderr) => {
        if (err) return cb(err, { stdout, stderr });
        const match = outputRegex.exec(stdout);
        if (!match) return cb("Unable to parse output", { stdout });

        const latency = parseFloat(match[1]);
        const latencyUnit = match[2];
        const requestsPerSec = parseFloat(match[3]);
        const transferPerSec = parseFloat(match[4]);
        const transferPerSecUnit = match[5];

        const latencyConversion = timeUnitConversions[latencyUnit.toLowerCase()];
        const latencyMs = latency * latencyConversion;

        const transgerConversion = sizeUnitConversions[transferPerSecUnit.toUpperCase()];
        const transferBytesPerSec = transferPerSec * transgerConversion;

        cb(null, { latencyMs, requestsPerSec, transferBytesPerSec, args, stdout });
    });
};
