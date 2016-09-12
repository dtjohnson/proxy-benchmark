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
            .map(["proxy", "wrk"], name => this._getInstanceIpAddress(name))
            .spread((proxyIpAddress, wrkIpAddress) => {
                // Keep track of the index of the benchmark we're on.
                const numBenchmarks = config.connections.length * config.messageLengths.length * config.dockerImages.proxies.length;
                let benchmarkCount = 0;

                // Run a benchmark for each connection, message length, and proxy option.
                return Promise.each(config.connections, connections => {
                    return Promise.each(config.messageLengths, messageLength => {
                        return Promise.each(config.dockerImages.proxies, (image, i) => {
                            console.log(`Running benchmark ${++benchmarkCount}/${numBenchmarks}`);
                            console.log(`\tNum connections: ${connections}`);
                            console.log(`\tMessage Length: ${messageLength}`);
                            console.log(`\tImage: ${image}`);
                            console.log();

                            return Promise.resolve()
                                .then(() => {
                                    // Call the wrk server to run the benchmark.
                                    return rp({
                                        uri: `http://${wrkIpAddress}/`,
                                        method: "POST",
                                        json: {
                                            url: `http://${proxyIpAddress}:${80 + i + 1}/${messageLength}`,
                                            connections,
                                            duration: config.duration,
                                            threads: config.threads
                                        }
                                    }).promise();
                                })
                                .then(results => this._writeResultsToFile(connections, messageLength, image, results))
                                .then(() => {
                                    if (benchmarkCount < numBenchmarks) return Promise.delay(config.delayBetween);
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
     * @param {number} connections - The number of connections.
     * @param {number} messageLength - The message length.
     * @param {string} image - The Docker image.
     * @param {{}} results - The benchmark results.
     * @returns {Promise} A promise.
     * @private
     */
    _writeResultsToFile(connections, messageLength, image, results) {
        return Promise.resolve()
            .then(() => fs.readFileAsync(resultsPath))
            .then(data => {
                const allResults = JSON.parse(data);
                const entry = { connections, messageLength, image, requestsPerSec: results.requestsPerSec, transferBytesPerSec: results.transferBytesPerSec };
                const i = _.findIndex(allResults, { connections, messageLength, image });
                if (i >= 0) {
                    allResults[i] = entry;
                } else {
                    allResults.push(entry);
                }

                return fs.writeFileAsync(resultsPath, JSON.stringify(allResults, null, 2));
            });
    }
};
