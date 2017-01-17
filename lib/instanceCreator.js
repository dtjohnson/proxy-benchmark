"use strict";

const Promise = require("bluebird");
const rp = require("request-promise");
const aws = require("./aws");
const config = require("../config");
const userDataBuilder = require("./userDataBuilder");

module.exports = {
    /**
     * Create the benchmark cluster.
     * @returns {Promise} A promise.
     */
    create() {
        console.log("Creating benchmark cluster...");
        return Promise.resolve()
            .then(() => {
                // Create the upstream instance first. We need its IP address to feed to the proxy server user data.
                const upstreamUserData = userDataBuilder({
                    image: config.dockerImages.upstream,
                    port: 80
                });

                return this._createInstance("upstream", upstreamUserData);
            })
            .then(upstreamInstanceId => this._waitForInstanceIpAddress(upstreamInstanceId))
            .then(upstreamIpAddress => {
                const dockerConfigs = [];

                // Create the user data for the proxy instance. We'll feed the upstream IP/port as environmental vars.
                [true, false].forEach(keepAlive => {
                    const env = {
                        UPSTREAM_HOST: upstreamIpAddress,
                        UPSTREAM_PORT: 80,
                        UPSTREAM_KEEP_ALIVE: keepAlive
                    };
                    config.dockerImages.proxies.forEach((image, i) => {
                        const port = (keepAlive ? 90 : 80) + i + 1;
                        const sslPort = (keepAlive ? 453 : 443) + i + 1;
                        dockerConfigs.push({ image, port, sslPort, env });
                    });
                });

                // Add the upstream server on the proxy instance as well just to support instance health checking.
                dockerConfigs.push({
                    image: config.dockerImages.upstream,
                    port: 80
                });

                const proxyUserData = userDataBuilder(dockerConfigs);

                // Create the wrk user data as well.
                const wrkUserData = userDataBuilder({
                    image: config.dockerImages.wrk,
                    port: 80
                });

                // Start health-checking the upstream instance and spin up the proxy and wrk instances.
                // Wait for all three to be healthy.
                return Promise.all([
                    this._waitForInstanceToBeHealthy(upstreamIpAddress),
                    this._createInstance("proxy", proxyUserData)
                        .then(proxyInstanceId => this._waitForInstanceIpAddress(proxyInstanceId))
                        .then(proxyIpAddress => this._waitForInstanceToBeHealthy(proxyIpAddress)),
                    this._createInstance("wrk", wrkUserData)
                        .then(wrkInstanceId => this._waitForInstanceIpAddress(wrkInstanceId))
                        .then(wrkIpAddress => this._waitForInstanceToBeHealthy(wrkIpAddress))
                ]);
            })
            .then(() => console.log("Benchmark cluster started!"));
    },

    /**
     * Create an instance.
     * @param {string} name - The name of the instance.
     * @param {string} userData - The user data.
     * @returns {Promise.<string>} A promise yielding the instance ID.
     * @private
     */
    _createInstance(name, userData) {
        console.log(`Creating instance ${name}...`);
        return Promise.resolve()
            .then(() => {
                // Create the instance.
                return aws.ec2.runInstancesAsync({
                    ImageId: config.imageId,
                    MinCount: 1,
                    MaxCount: 1,
                    InstanceType: config.instanceType,
                    SecurityGroupIds: [config.securityGroupId],
                    UserData: new Buffer(userData).toString('base64')
                });
            })
            .then(res => {
                // Tag the instance with the name (we'll use the name to clean it up in the shutdown script).
                const instanceId = res.Instances[0].InstanceId;

                console.log(`Tagging instance ${name}...`);
                return aws.ec2.createTagsAsync({
                    Resources: [instanceId],
                    Tags: [{
                        Key: "Name",
                        Value: `proxy-benchmark-${name}`
                    }]
                }).return(instanceId);
            });
    },

    /**
     * Wait for the instance to have an IP address (which is not available immediately).
     * @param {string} instanceId - The instance ID.
     * @returns {Promise.<string>} - A promise yielding the IP address.
     * @private
     */
    _waitForInstanceIpAddress(instanceId) {
        console.log(`Waiting for instance ${instanceId} to have an IP address...`);

        // Wait 10 seconds between attempts.
        return Promise
            .delay(10 * 1000)
            .then(() => {
                // Get the instance details.
                console.log(`Describing instance '${instanceId}...`);
                return aws.ec2.describeInstancesAsync({
                    InstanceIds: [instanceId]
                });
            })
            .then(res => {
                const ipAddress = res.Reservations[0].Instances[0].PublicIpAddress;

                // If the IP address exists, return it.
                if (ipAddress) {
                    console.log(`Instance ${instanceId} is associated to IP ${ipAddress}!`);
                    return ipAddress;
                }

                // Otherwise, wait again.
                console.log(`Instance ${instanceId} does not have an IP address yet.`);
                return this._waitForInstanceIpAddress(instanceId);
            });
    },

    /**
     * Wait for the instance to be healthy by hitting a health check URL repeatedly.
     * @param {string} ipAddress - The instance IP address.
     * @returns {Promise} A promise.
     * @private
     */
    _waitForInstanceToBeHealthy(ipAddress) {
        console.log(`Waiting for ${ipAddress} to become healthy...`);

        // Wait 30 seconds between attempts.
        return Promise
            .delay(30 * 1000)
            .then(() => {
                // Request the health check route.
                const uri = `http://${ipAddress}/health-check`;
                console.log(`Requesting ${uri}...`);
                return rp(uri).promise();
            })
            .catch(() => {
                // If the request failed, try again.
                console.log(`Request to ${ipAddress} failed.`);
                return this._waitForInstanceToBeHealthy(ipAddress);
            });
    }
};
