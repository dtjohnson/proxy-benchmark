"use strict";

const AWS = require("aws-sdk");
const Promise = require("bluebird");
const config = require("../config");

AWS.config.update({ region: config.region });

module.exports = {
    ec2: Promise.promisifyAll(new AWS.EC2())
};
