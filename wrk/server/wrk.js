"use strict";

const execFile = require("child_process").execFile;
const outputRegex = /Requests\/sec:\s+([\d.]+)\s+Transfer\/sec:\s+([\d.]+)(\w+)/;

const unitConversions = {
    B: 1,
    KB: 1024,
    MB: 1024 * 1024,
    GB: 1024 * 1024 * 1024
};

module.exports = (opts, cb) => {
    const args = [
        "-d", `${opts.duration || 10}s`,
        "-c", opts.connections || 1,
        "-t", opts.threads || 1,
        opts.url
    ];

    execFile("wrk", args, (err, stdout, stderr) => {
        if (err) return cb(err, { stdout, stderr });
        const match = outputRegex.exec(stdout);
        if (!match) return cb("Unable to parse output", { stdout });

        const requestsPerSec = parseInt(match[1]);
        const transferPerSec = parseInt(match[2]);
        const transferPerSecUnit = match[3];

        const conversion = unitConversions[transferPerSecUnit.toUpperCase()];
        const transferBytesPerSec = transferPerSec * conversion;

        cb(null, { requestsPerSec, transferBytesPerSec, stdout });
    });
};
