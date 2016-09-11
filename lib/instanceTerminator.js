"use strict";

const Promise = require("bluebird");
const aws = require("./aws");

module.exports = {
    /**
     * Terminate the instances in the cluster.
     * @returns {Promise} A promise.
     */
    terminate() {
        console.log("Terminating benchmark cluster...");
        return Promise
            .map(["upstream", "proxy", "wrk"], name => this._getInstanceId(name))
            .then(instanceIds => this._terminateInstances(instanceIds))
            .then(() => console.log("Benchmark cluster shut down!"));
    },

    /**
     * Get the ID of the instance with the given name.
     * @param {string} name - The name of the instance.
     * @returns {Promise.<string>} - The instance ID.
     * @private
     */
    _getInstanceId(name) {
        console.log(`Getting instance ID for ${name}...`);
        return Promise.resolve()
            .then(() => {
                return aws.ec2.describeInstancesAsync({
                    Filters: [{
                        Name: "tag:Name",
                        Values: [`proxy-benchmark-${name}`]
                    }, {
                        Name: "instance-state-name",
                        Values: ["running"]
                    }]
                });
            })
            .then(res => {
                if (res.Reservations.length !== 1) throw new Error("Reservation count !== 1");
                if (res.Reservations[0].Instances.length !== 1) throw new Error("Instance count !== 1");
                const instanceId = res.Reservations[0].Instances[0].InstanceId;
                console.log(`Instance ${name} has ID ${instanceId}.`);
                return instanceId;
            });
    },

    /**
     * Terminate the instances with the given IDs.
     * @param {Array.<string>} instanceIds - The IDs of the instances to terminate.
     * @returns {Promise} A promise.
     * @private
     */
    _terminateInstances(instanceIds) {
        console.log(`Terminating instances ${instanceIds}...`);
        return aws.ec2.terminateInstancesAsync({
            InstanceIds: instanceIds
        });
    }
};
