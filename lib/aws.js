"use strict";

const AWS = require("aws-sdk");
const config = require("../config");

AWS.config.update({ region: config.region });

module.exports = {
    ec2: new AWS.EC2()
};
