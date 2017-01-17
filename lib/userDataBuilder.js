"use strict";

const _ = require("lodash");

module.exports = dockerConfigs => {
    if (!Array.isArray(dockerConfigs)) dockerConfigs = [dockerConfigs];
    let userData = "#!/bin/bash\n\n";
    dockerConfigs.forEach(dockerConfig => {
        userData += `docker run -d -p ${dockerConfig.port}:80`;
        if (dockerConfig.sslPort) userData += ` -p ${dockerConfig.sslPort}:443`;
        _.forOwn(dockerConfig.env, (value, key) => {
            userData += ` -e ${key}=${value}`;
        });
        userData += ` ${dockerConfig.image}\n`;
    });

    return userData;
};
