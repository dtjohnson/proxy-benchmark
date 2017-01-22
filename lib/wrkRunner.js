"use strict";

const _ = require("lodash");
const Promise = require("bluebird");
const rp = require("request-promise");
const fs = Promise.promisifyAll(require("fs"));
const config = require("../config");
const aws = require("./aws");

const resultsPath = `${__dirname}/../results.json`;

module.exports = {
    /**
     * Run the benchmark suite.
     * @returns {Promise} A promise.
     */
    run() {
        return Promise
            .map(["upstream", "proxy", "wrk"], name => this._getInstanceIpAddress(name))
            .spread((upstreamIpAddress, proxyIpAddress, wrkIpAddress) => {
                // Keep track of the index of the benchmark we're on.
                const numBenchmarks = config.requestRates.length * config.compressions.length * config.keepAlives.length * config.ssls.length * config.delays.length * config.connections.length * config.messageLengths.length * (config.dockerImages.proxies.length + 1);
                let benchmarkCount = 0;

                // Run a benchmark for each connection, message length, and proxy option.
                return Promise.each(config.compressions, compression => {
                    return Promise.each(config.keepAlives, keepAlive => {
                        return Promise.each(config.ssls, ssl => {
                            return Promise.each(config.delays, delay => {
                                return Promise.each(config.connections, connections => {
                                    return Promise.each(config.messageLengths, messageLength => {
                                        return Promise.each(config.requestRates, requestRate => {
                                            const images = ["direct"].concat(config.dockerImages.proxies);
                                            return Promise.each(images, (image, i) => {
                                                console.log(`Running benchmark ${++benchmarkCount}/${numBenchmarks}`);
                                                console.log(`\tDelay: ${delay}ms`);
                                                console.log(`\tCompression: ${compression}`);
                                                console.log(`\tSSL: ${ssl}`);
                                                console.log(`\tUpstream Keep-Alive: ${keepAlive}`);
                                                console.log(`\tNum connections: ${connections}`);
                                                console.log(`\tMessage Length: ${messageLength}`);
                                                console.log(`\tRequest Rate: ${requestRate}/s`);
                                                console.log(`\tImage: ${image}`);
                                                console.log();

                                                // Connect to the upstream or the proxy server.
                                                let url, protocol;
                                                if (image === "direct") {
                                                    url = `http://${upstreamIpAddress}/${messageLength}?delay=${delay}`;
                                                } else {
                                                    let port;
                                                    if (ssl) {
                                                        port = (keepAlive ? 453 : 443) + i;
                                                    } else {
                                                        port = (keepAlive ? 90 : 80) + i;
                                                    }

                                                    url = `http${ssl ? 's' : ''}://${proxyIpAddress}:${port}/${messageLength}?delay=${delay}`;
                                                }

                                                const threads = Math.ceil(connections / config.connectionsPerThread);

                                                return Promise.resolve()
                                                    .then(() => {
                                                        // Call the wrk server to run the benchmark.
                                                        return rp({
                                                            uri: `http://${wrkIpAddress}/`,
                                                            method: "POST",
                                                            json: {
                                                                url,
                                                                compression,
                                                                connections,
                                                                duration: config.duration,
                                                                threads,
                                                                requestRate
                                                            }
                                                        }).promise();
                                                    })
                                                    .then(results => this._writeResultsToFile(delay, keepAlive, ssl, compression, connections, messageLength, requestRate, image, results))
                                                    .then(() => {
                                                        if (benchmarkCount < numBenchmarks) return Promise.delay(config.delayBetween);
                                                    });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
    },

    /**
     * Get IP address of the instance with the given name.
     * @param {string} name - The name of the instance.
     * @returns {Promise.<string>} A promise yielding the IP address.
     * @private
     */
    _getInstanceIpAddress(name) {
        console.log(`Describing instance '${name}'...`);
        return aws.ec2.describeInstancesAsync({
            Filters: [{
                Name: "tag:Name",
                Values: [`proxy-benchmark-${name}`]
            }, {
                Name: "instance-state-name",
                Values: ["running"]
            }]
        }).then(res => {
            if (res.Reservations.length !== 1) throw new Error("Reservation count !== 1");
            if (res.Reservations[0].Instances.length !== 1) throw new Error("Instance count !== 1");
            const ipAddress = res.Reservations[0].Instances[0].PublicIpAddress;
            console.log(`Instance ${name} has IP ${ipAddress}.`);
            return ipAddress;
        });
    },

    /**
     * Write the results to the results file.
     * @param {number} delay - The upstream server delay.
     * @param {boolean} keepAlive - A flag indicating whether upstream keep-alive was used.
     * @param {boolean} compression - A flag indicating whether compression was used.
     * @param {number} connections - The number of connections.
     * @param {number} messageLength - The message length.
     * @param {string} image - The Docker image.
     * @param {{}} results - The benchmark results.
     * @returns {Promise} A promise.
     * @private
     */
    _writeResultsToFile(delay, keepAlive, ssl, compression, connections, messageLength, requestRate, image, results) {
        return Promise.resolve()
            .then(() => fs.readFileAsync(resultsPath))
            .then(data => {
                const allResults = JSON.parse(data);
                const entry = {
                    delay,
                    keepAlive,
                    ssl,
                    compression,
                    connections,
                    messageLength,
                    image,
                    requestRate,
                    latencyMs: results.latencyMs,
                    requestsPerSec: results.requestsPerSec,
                    transferBytesPerSec: results.transferBytesPerSec
                };
                const i = _.findIndex(allResults, { delay, keepAlive, ssl, compression, connections, messageLength, requestRate, image });
                if (i >= 0) {
                    allResults[i] = entry;
                } else {
                    allResults.push(entry);
                }

                return fs.writeFileAsync(resultsPath, JSON.stringify(allResults, null, 2));
            });
    }
};
