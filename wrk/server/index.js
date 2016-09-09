"use strict";

const express = require('express');
const bodyParser = require('body-parser');
const wrk = require('./wrk');

process.on('SIGINT', () => process.exit(1));
process.on('SIGTERM', () => process.exit(1));

const app = express();
app.use(bodyParser.json());

app.get("/", (req, res) => {
    res.send("OK");
});

app.post('/', (req, res) => {
    wrk(req.body, (err, output) => {
        if (err) return res.status(500).send({ err, output });
        res.send(output);
    });
});

app.listen(80, function () {
    console.log('wrk listening on port 80...');
});
